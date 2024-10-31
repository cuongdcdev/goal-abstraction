import { ethers } from 'ethers';
import { sign } from './near';
import * as bitcoinJs from 'bitcoinjs-lib';
import coininfo from 'coininfo';
import { fetchJson } from './utils';
import prompts from 'prompts';

const SATS = 100000000;

const dogecoin = {
    name: 'Dogecoin Mainnet',
    currency: 'DOGE',
    explorer: 'https://blockexplorer.one/dogecoin/mainnet',
    getBalance: async ({ address, getUtxos }) => {
        const query = new URLSearchParams({
            pageSize: '50',
            txType: 'incoming',
        }).toString();

        const res = await dogeGet(`/transaction/address/${address}?${query}`);
        let maxUtxos = [];
        res.forEach((tx) => {
            let maxValue = 0;
            let index = 0;
            tx.outputs.forEach((o, i) => {
                if (o.address !== address) return;
                const value = parseFloat(o.value);
                if (value > maxValue) {
                    maxValue = value;
                    index = i;
                }
            });
            maxUtxos.push({
                hash: tx.hash,
                index,
            });
        });

        // find utxos
        let utxos = await Promise.all(
            maxUtxos.map(async ({ hash, index }) => {
                const res = await dogeGet(`/utxo/${hash}/${index}`, true);
                if (!res) {
                    // console.log('no utxo found: ', hash);
                    return;
                }
                // console.log('utxo found:', hash);
                const res2 = await dogeRpcCall('getrawtransaction', [
                    hash,
                    true,
                ]);
                return {
                    value: res.value,
                    hash,
                    index,
                    nonWitnessUtxo: Buffer.from(res2.result.hex, 'hex'),
                };
            }),
        );

        // filter undefined (bad responses)
        utxos = utxos.filter((utxo) => utxo !== undefined);

        // ONLY SIGNING 1 UTXO PER TX
        let maxValue = 0;
        utxos.forEach((utxo) => {
            if (utxo.value > maxValue) maxValue = utxo.value;
        });
        utxos = utxos.filter((utxo) => utxo.value === maxValue);
        console.log("find balance utxos: ", utxos);
        return utxos;
    },
    
    send: async ({
        from: address,
        publicKey,
        to = '',
        amount = '1',
    }, mpcPath: string) => {
        
        let resultObject = {
            status: "success",
            txHash: "",
            explorerLink: "",
            message: "",
        }
        const { getBalance, explorer, currency } = dogecoin;

        const utxos = await getBalance({
            address,
            getUtxos: true,
        });
        let amountToSend = parseFloat(amount) * 0.9; // 10% fee and gas fee
        // Convert everything to sats for precise calculations
        const balanceInSats = (Math.max(...utxos.map(utxo => utxo.value)) * SATS); //get the largest utxo
        const amountToSendSats = (amountToSend * SATS);
        console.log("max utxo value: ", Math.max(...utxos.map(utxo => utxo.value)) , utxos);

        // Calculate fee before checking balance
        const estimatedSize = utxos.length * 148 + 2 * 34 + 10;
        const fee = estimatedSize * 3000; // fee rate in sats
        
        // Check if we have enough balance including the fee
        console.log('Sender address:', address);
        const totalNeeded = amountToSendSats + fee;
        if (balanceInSats < totalNeeded) {
            console.log('Balance:', balanceInSats / SATS, 'DOGE');
            console.log('Amount to send:', amountToSendSats / SATS, 'DOGE');
            console.log('Fee:', fee / SATS, 'DOGE');
            console.log('Total needed:', totalNeeded / SATS, 'DOGE');
            console.log('Insufficient funds: need', totalNeeded / SATS, 'DOGE but only have', balanceInSats / SATS, 'DOGE');
            
            resultObject.status = "error";
            resultObject.message = `Insufficient funds: need ${totalNeeded / SATS} DOGE but only have ${balanceInSats / SATS} DOGE`;
            return resultObject;
        }

        console.log('Balance:', balanceInSats / SATS, 'DOGE');
        console.log('Sending:', amountToSendSats / SATS, 'DOGE');
        console.log('Fee:', fee / SATS, 'DOGE');
        
        const network = coininfo.dogecoin.main.toBitcoinJS();
        const psbt = new bitcoinJs.Psbt({ network });

        // Add input
        psbt.addInput({
            hash: utxos[0].hash,
            index: utxos[0].index,
            nonWitnessUtxo: utxos[0].nonWitnessUtxo,
        });

        // Add output for recipient
        psbt.addOutput({
            address: to,
            value: amountToSendSats,
        });

        // Calculate and add change output if needed
        const change = balanceInSats - amountToSendSats - fee;
        if (change > 546) { // dust threshold
            psbt.addOutput({
                address: address,
                value: change,
            });
        }

        const keyPair = {
            publicKey: Buffer.from(publicKey, 'hex'),
            sign: async (transactionHash) => {
                const payload = Object.values(
                    ethers.utils.arrayify(transactionHash),
                );

                const sig: any = await sign(payload, mpcPath);
                console.log("sig object: ", sig);  
                if (!sig) {
                    throw new Error('Failed to get signature');
                }

                // sig.r and sig.s are already Buffers, so we can concatenate them directly
                const signature = Buffer.concat([sig.r, sig.s]);
                if (signature.length !== 64) {
                    throw new Error(`Invalid signature length: ${signature.length}`);
                }
                
                return signature;
            },
        };

        await Promise.all(
            utxos.map(async (_, index) => {
                try {
                    await psbt.signInputAsync(index, keyPair);
                } catch (e) {
                    console.warn('not signed', e.message);
                }
            }),
        );

        psbt.finalizeAllInputs();

        try {
            const body = { txData: psbt.extractTransaction().toHex() };
            console.log('Broadcasting transaction with data:', body);
            const res = await dogePost(`/broadcast`, body);
            
            if (!res || !res.txId) {
                resultObject.status = "error";
                resultObject.message = `Invalid response from broadcast: ${JSON.stringify(res)}`;
                console.error("Invalid broadcast: " , res);
                return resultObject;
            }
            
            const hash = res.txId;
            console.log('tx hash', hash);
            console.log('explorer link', `${explorer}/tx/${hash}`);
            console.log(
                'NOTE: it might take a minute for transaction to be included in mempool',
            );
            
            resultObject.txHash = hash;
            resultObject.explorerLink = `${explorer}/tx/${hash}`;
            resultObject.message = 'Transaction broadcast successfully. It might take few minutes for transaction to be included in mempool';
            
            return resultObject;
        } catch (e) {
            console.error('Error broadcasting dogecoin tx:', {
                error: e.message,
                response: e.response?.data,
                status: e.response?.status,
                fullError: e
            });
            resultObject.status = "error";
            resultObject.message = `Failed to broadcast transaction: ${e.message}`;
            return resultObject;
        }
    },
};

// doge helpers

const dogeRpc = `https://api.tatum.io/v3/dogecoin`;
// const dogeRpc = `https://doge-mainnet.gateway.tatum.io/`;
const dogeGet = (path, noWarnings = false) =>
    fetchJson(
        `${dogeRpc}${path}`,
        {
            method: 'GET',
            headers: {
                'x-api-key': process.env.TATUM_API_KEY,
            },
        },
        noWarnings,
    );

const dogePost = (path, body) =>
    fetchJson(`${dogeRpc}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.TATUM_API_KEY,
        },
        body: JSON.stringify(body),
    });

const dogeRpcCall = (method, params) =>
    fetchJson(
        // `https://api.tatum.io/v3/blockchain/node/doge-mainnet/${process.env.TATUM_API_KEY}`,
        `https://api.tatum.io/v3/blockchain/node/doge-mainnet/${process.env.TATUM_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.TATUM_API_KEY,
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: 1,
            }),
        },
    );

export default dogecoin;
