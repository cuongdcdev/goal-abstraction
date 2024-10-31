import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { compressPublicKey, generateAddress } from './kdf';

import { getChallengeById } from './src/near';
import 
const app = express();
const port = 3000;

export const genAddress = (chain, bech32Prefix = "nearca") => {
  let accountId =
      NEAR_PROXY_ACCOUNT === 'true' || NEAR_PROXY_CONTRACT === 'true'
          ? NEAR_PROXY_ACCOUNT_ID
          : NEAR_ACCOUNT_ID;
  return generateAddress({
      publicKey: MPC_PUBLIC_KEY,
      accountId,
      path: MPC_PATH,
      chain,
      bech32Prefix,
  });
};




// Middleware
app.use(bodyParser.json());

// Define the Challenge interface
interface Challenge {
  id: number;
  [key: string]: any;
}

// Sample data
let challenges: Challenge[] = [];

// Routes
app.get('/challenges', (req: Request, res: Response) => {
  res.json(challenges);
});

app.post('/finalize/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const challengeIndex = challenges.findIndex(c => c.id === id);
  if (challengeIndex !== -1) {
    challenges[challengeIndex] = { ...challenges[challengeIndex], ...req.body };
    res.json(challenges[challengeIndex]);
  } else {
    res.status(404).json({ message: 'Challenge not found' });
  }
});

app.get('/test', async (req: Request, res: Response) => {
  let cid = "idfea0ed76fa47b8b46d8a6b692f5678c257accb22ba2f601858aa7dffa5d8c036";
  // let address = await genAddress("ethereum", cid);
  let address = "test addr";
  res.json({
    message: "ok",
    data: {
      body: req.body,
      challenge: await getChallengeById(cid),
      address: address,
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
