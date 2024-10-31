import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import BN from 'bn.js';
import { fetchJson } from './utils';
import prompts from 'prompts';
import { sign } from './near';
const { MPC_PATH, NEAR_PROXY_CONTRACT } = process.env;

const ethereum = {
    name: 'Sepolia',
    chainId: 11155111,
    currency: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    gasLimit: 21000,
    jsonrpcprovider:'https://ethereum-sepolia-rpc.publicnode.com',

    setChain: ({
        name = 'Sepolia',
        chainId = 11155111,
        currency = 'ETH',
        explorer = 'https://sepolia.etherscan.io',
        gasLimit = 21000,
        jsonrpcprovider = 'https://ethereum-sepolia-rpc.publicnode.com',
    } = {}) => {
        ethereum.name = name;
        ethereum.chainId = chainId;
        ethereum.currency = currency;
        ethereum.explorer = explorer;
        ethereum.gasLimit = gasLimit;
        ethereum.jsonrpcprovider = jsonrpcprovider
    },

    getGasPrice: async () => {
        return 3002434137; // for testing

        // get current gas prices on Sepolia
        const {
            data: { rapid, fast, standard },
        } = await fetchJson(
            `https://sepolia.beaconcha.in/api/v1/execution/gasnow`,
        );
        let gasPrice = Math.max(rapid, fast, standard);
        if (!gasPrice) {
            console.log(
                'Unable to get gas price. Please refresh and try again.',
            );
        }
        return Math.max(rapid, fast, standard);
    },

    getBalance: ({ address }) => getRPCProvider().getBalance(address),

    getBalanceHumanreadable: async ({ address }) => {
        let b = ethers.utils.formatUnits(await getRPCProvider().getBalance(address), 'ether');
        console.log("balance human readable : ", b);
        return b;
    },

    send: async ({
        from: address,
        to = '',
        amount = '0.001',
    }, mpcPath) => {
        let msg: any ;
        if (!address){
            msg = "must provide a sending address";
            return {
                status: "failed",
                data: msg
            };
        };

        const {
            getGasPrice,
            gasLimit,
            chainId,
            getBalance,
            completeEthereumTx,
            currency,
        } = ethereum;

        const balance = await getBalance({ address });
        console.log('balance', ethers.utils.formatUnits(balance), currency);

        const provider = getRPCProvider();
        // get the nonce for the sender
        const nonce = await provider.getTransactionCount(address);
        const gasPrice = await getGasPrice();

        // check sending value
        const value = ethers.utils.hexlify(ethers.utils.parseUnits(amount));
        if (value === '0x00') {
            console.log('Amount is zero. Please try a non-zero amount.');
            return{
                status: "failed",
                data: "Amount is zero. Please try a non-zero amount."
            };
        }

        // check account has enough balance to cover value + gas spend
        const overrideBalanceCheck = true;
        if (
            !overrideBalanceCheck &&
            (!balance ||
                new BN(balance.toString()).lt(
                    new BN(ethers.utils.parseUnits(amount).toString()).add(
                        new BN(gasPrice).mul(new BN(gasLimit.toString())),
                    ),
                ))
        ) {
            console.log('insufficient funds');

            
            return {
                status: "failed",
                data: "Insufficient funds, maybe the prize is already distributed"
            };
        }

        console.log('sending', amount, currency, 'from', address, 'to', to);
        // const cont = await prompts({
        //     type: 'confirm',
        //     name: 'value',
        //     message: 'Confirm? (y or n)',
        //     initial: true,
        // });
        // if (!cont.value) return;

        const baseTx = {
            to,
            nonce,
            data: [],
            value,
            gasLimit,
            gasPrice,
            chainId,
        };

       return await completeEthereumTx({ address, baseTx }, mpcPath);
    },


    view: async ({
        to = '0x09a1a4e1cfca73c2e4f6599a7e6b98708fda2664',
        method = 'balanceOf',
        args = { address: '0x525521d79134822a342d330bd91da67976569af1' },
        ret = ['uint256'],
    }) => {
        const provider = getRPCProvider();
        console.log('view contract', to);
        const { data, iface } = encodeData({ method, args, ret });
        const res = await provider.call({
            to,
            data,
        });
        const decoded = iface.decodeFunctionResult(method, res);
        console.log('view result', decoded.toString());
    },

    call: async ({
        from: address,
        to = '0x09a1a4e1cfca73c2e4f6599a7e6b98708fda2664',
        method = 'mint',
        args = { address: '0x525521d79134822a342d330bd91da67976569af1' },
        ret = [],
    }, mpcPath) => {
        const { getGasPrice, completeEthereumTx, chainId } = ethereum;

        const provider = getRPCProvider();
        console.log('call contract', to);
        const { data } = encodeData({ method, args, ret });

        const cont = await prompts({
            type: 'confirm',
            name: 'value',
            message: 'Confirm? (y or n)',
            initial: true,
        });
        if (!cont.value) return;

        const gasPrice = await getGasPrice();
        const nonce = await provider.getTransactionCount(address);
        const baseTx = {
            to,
            nonce,
            data,
            value: 0,
            gasLimit: 1000000, // 1m
            gasPrice,
            chainId,
        };

        await completeEthereumTx({ address, baseTx }, mpcPath);
    },

    completeEthereumTx: async ({ address, baseTx }, mpcPath) => {
        const { chainId, getBalance, explorer, currency } = ethereum;
        let msg: any = "smt wrong";
        let status = "failed";
        // create hash of unsigned TX to sign -> payload
        const unsignedTx = ethers.utils.serializeTransaction(baseTx);
        const txHash = ethers.utils.keccak256(unsignedTx);
        const payload = Object.values(ethers.utils.arrayify(txHash));

        // get signature from MPC contract
        let sig;
        if (NEAR_PROXY_CONTRACT === 'true') {
            sig = await sign(unsignedTx, MPC_PATH);
        } else {
            sig = await sign(payload, mpcPath);
        }
        if (!sig) return;

        sig.r = '0x' + sig.r.toString('hex');
        sig.s = '0x' + sig.s.toString('hex');
        // console.log('sig', sig);

        // check 2 values for v (y-parity) and recover the same ethereum address from the generateAddress call (in app.ts)
        let addressRecovered = false;
        for (let v = 0; v < 2; v++) {
            sig.v = v + chainId * 2 + 35;
            const recoveredAddress = ethers.utils.recoverAddress(payload, sig);
            if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
                addressRecovered = true;
                break;
            }
        }
        if (!addressRecovered) {
            msg = 'signature failed to recover correct sending address';
            return {
                status: status,
                data: msg
            };
        }

        // broadcast TX - signature now has correct { r, s, v }
        try {
            const hash = await getRPCProvider().send(
                'eth_sendRawTransaction',
                [ethers.utils.serializeTransaction(baseTx, sig)],
            );
            console.log('tx hash', hash);
            console.log('explorer link', `${explorer}/tx/${hash}`);
            status = "success";
            msg = {
                txHash : hash,
                explorer: `${explorer}/tx/${hash}`
            }
            // console.log('fetching updated balance in 60s...');
            // setTimeout(async () => {
            //     const balance = await getBalance({ address });
            //     console.log(
            //         'balance',
            //         ethers.utils.formatUnits(balance),
            //         currency,
            //     );
            // }, 60000);
        } catch (e) {
            if (/nonce too low/gi.test(JSON.stringify(e))) {
                msg = 'tx has been tried , nonce is too low';
                console.log(msg);
            }
            if (/gas too low|underpriced/gi.test(JSON.stringify(e))) {
                console.log(e);
                msg = 'gas too low or underpriced: ' + JSON.stringify(e);
            }
            status = "failed";
            console.log(e);
            return {
                status: status,
                data: msg
            };
        }
        return {
            status: status,
            data: msg
        };
    },

    /**
     * number,string to Ethereum BigNumber
     * @param amount number of string 
     * @returns 
     */
    parseUnits: (amount) => ethers.utils.parseUnits(amount, 'ether'),

    /**
     * Ethereum BigNumber to number,string
     * @param amount 
     * @returns 
     */
    formatUnits: (amount) => ethers.utils.formatUnits(amount, 'ether'),
};

const encodeData = ({ method, args, ret }) => {
    const abi = [
        `function ${method}(${Object.keys(args).join(',')}) returns (${ret.join(
            ',',
        )})`,
    ];
    const iface = new ethers.utils.Interface(abi);
    const allArgs = [];
    const argValues = Object.values(args);
    for (let i = 0; i < argValues.length; i++) {
        allArgs.push(argValues[i]);
    }

    console.log(abi[0], 'with args', allArgs);

    return {
        iface,
        data: iface.encodeFunctionData(method, allArgs),
    };
};

const getRPCProvider = () => {
    return new ethers.providers.JsonRpcProvider(ethereum.jsonrpcprovider);
};

export default ethereum;
