import express from 'express';
import bodyParser from 'body-parser';
import { compressPublicKey, generateAddress } from './src/kdf';
import { sign, account, getChallengeById } from './src/near';
import dogecoin from './src/dogecoin';
import ethereum from './src/ethereum';
import bitcoin from './src/bitcoin';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const {
  MPC_PUBLIC_KEY,
  NEAR_ACCOUNT_ID,
  MPC_CONTRACT_ID,
  MPC_PATH,
  NEAR_PROXY_ACCOUNT,
  NEAR_PROXY_CONTRACT,
  NEAR_PROXY_ACCOUNT_ID,
} = process.env;

const baseChainConfig = {
  name: 'Base Sepolia',
  chainId: 84532,
  currency: 'ETH',
  explorer: 'https://sepolia.basescan.org/',
  gasLimit: 21000,
  jsonrpcprovider: 'https://sepolia.base.org',
};


const arbChainConfig = {
  name: 'Arbitrum Sepolia',
  chainId: 421614,
  currency: 'ETH',
  explorer: 'https://sepolia.arbiscan.io/',
};

export const genAddress = (chain, mpcPath = MPC_PATH, bech32Prefix = "nearca") => {
  let accountId =
    NEAR_PROXY_ACCOUNT === 'true' || NEAR_PROXY_CONTRACT === 'true'
      ? NEAR_PROXY_ACCOUNT_ID
      : NEAR_ACCOUNT_ID;
  return generateAddress({
    publicKey: MPC_PUBLIC_KEY,
    accountId,
    path: mpcPath,
    chain,
    bech32Prefix,
  });
};

// Get MPC public key
app.get('/public-key', async (req, res) => {
  const public_key = await account.viewFunction({
    contractId: MPC_CONTRACT_ID,
    methodName: 'public_key',
  });
  res.json({ public_key });
});



// Send transactions
app.post('/send-test/', async (req, res) => {
  let result;

  try {
    const { to, amount, chain, mpcPath } = req.body;
    switch (chain) {
      case 'ETH':
        const { address: ethAddress } = await genAddress('ETH', mpcPath);
        result = await ethereum.send({ from: ethAddresslocalhost, to, amount }, mpcPath);
        break;
      case 'BASE':
        const { address: baseAddress } = await genAddress('ETH');
        ethereum.setChain(baseChainConfig);
        result = await ethereum.send({ from: baseAddress, to, amount }, mpcPath);
        break;
      // case 'BTC':
      //     const { address: btcAddress, publicKey: btcPublicKey } = await genAddress('bitcoin');
      //     result = await bitcoin.send({ from: btcAddress, publicKey: btcPublicKey, to, amount });
      //     break;
      // case 'DOGE':
      //     const { address: dogeAddress, publicKey: dogePublicKey } = await genAddress('DOGE', "cuong");
      //     result = await dogecoin.send({ from: dogeAddress, publicKey: dogePublicKey, to, amount }, "cuong");
      //     break;


      case 'DOGE':
        const { address: dogeAddress, publicKey: dogePublicKey } = await genAddress('DOGE', mpcPath)
        result = await dogecoin.send({ from: dogeAddress, publicKey: dogePublicKey, to, amount }, mpcPath);
        break;

      default:
        return res.status(400).json({ status: "failed", error: 'Unsupported chain' });
    }
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      error: error.message || 'Internal server error'
    });
  }

  res.json({
    status: "success",
    result
  });
});

app.post('/get-balance/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  let balance: any;

  try {
    switch (chain) {
      case 'ETH':
        balance = await ethereum.getBalanceHumanreadable({ address });
        break;

      case 'BASE':
        ethereum.setChain(baseChainConfig);
        balance = await ethereum.getBalanceHumanreadable({ address });
        break;

      // TODO: support Dogechain mainnet 
      case 'DOGE':
        balance = await dogecoin.getBalance({ address: address, getUtxos: true });
        break;

      default:
        return res.status(400).json({ status: "failed", error: 'Unsupported chain' });
    }

    res.json({ status: "success", balance: balance });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      error: error.message || 'Internal server error'
    });
  }
});

app.post('/finalize/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = challengeId ? await getChallengeById(challengeId) : null;
    if (!challengeId || !challenge || challenge.status == "Open") {
      return res.status(400).json({ error: 'Challenge not found or not closed yet' });
    }

    let to = challenge.status == "ClosedSuccess" ? challenge.success_addr : challenge.failed_addr;
    let amount = challenge.prize;
    let chain = challenge.chain;

    console.log("finalize, get challenge info:", challenge, "with following info: toAddr: ", to, "amount: ", amount, "chain: ", chain);

    let result: any;
    let success = true;

    //   success response: 
    //   {
    //     "result": {
    //         "status": "success",
    //         "data": {
    //             "txHash": "0xe422d525768b0e2dec0796f3689d873404c5afd21738cdb547839362a03ab132",
    //             "explorer": "https://sepolia.basescan.org//tx/0xe422d525768b0e2dec0796f3689d873404c5afd21738cdb547839362a03ab132"
    //         }
    //     }
    // }

    switch (chain) {
      case 'Ethereum':
        const { address: ethAddress } = await genAddress('ETH', challenge.id);
        let currentBalance = await ethereum.getBalance({ address: ethAddress });
        let amountTransfer = ethereum.parseUnits(String(parseFloat(amount) * 0.92)); //8% as fee
        console.log("Address: " + ethAddress + " current balance: ", ethereum.formatUnits(currentBalance), " | challenge amount: ", amount, " | Transfer: ", amountTransfer);
        //TODO: check if the balance is enough 
        if (currentBalance.gte(amountTransfer)) {
          result = await ethereum.send({ from: ethAddress, to, amount: String(parseFloat(amount) * 0.95) }, challenge.id);
        } else {
          success = false;
          result = "Insufficient balance, maybe the prize is already distributed";
        }
        break;

      case 'Base':
        const { address: baseAddress } = await genAddress('ETH', challenge.id);
        ethereum.setChain(baseChainConfig);
        let currentBalanceBase = await ethereum.getBalance({ address: baseAddress });
        console.log("Base testnet current balance: ", currentBalanceBase, " | challenge amount: ", amount);
        if (currentBalanceBase.gt(ethereum.parseUnits(String(parseFloat(amount) * 0.95)))) {
          result = await ethereum.send({ from: baseAddress, to, amount: String(parseFloat(amount) * 0.95) }, challenge.id);
        } else {
          success = false;
          result = "Insufficient balance, maybe the prize is already distributed";
        }
        break;

      // TODO: support Dogechain mainnet, 10% fee as gas fee
      case 'Dogecoin':
        const { address: dogeAddress, publicKey: dogePublicKey } = await genAddress('DOGE', challenge.id);
        result = await dogecoin.send({ from: dogeAddress, publicKey: dogePublicKey, to, amount }, challenge.id);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported chain' });
    }

    res.status(success ? 200 : 400).json({
      result,
      status: success ? "success" : "failed",
    });
  } catch (error) {
    console.error("Error in finalize:", error);
    res.status(500).json({
      status: "failed",
      error: error.message || "Internal server error"
    });
  }
});

/**
 * generate NEAR derived address for a given challenge ID
 */
app.post('/gen-address/:chain/:cid', async (req, res) => {
  try {
    let { cid, chain } = req.params;
    let address = await genAddress(chain, cid);
    console.log("generate NEAR derived address for cid: ", cid, " | chain: ", chain);
    console.log("derived address: ", address);
    res.json({
      status: "success",
      data: address,
    });
  } catch (error) {
    console.error("Error generating address:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate address"
    });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
