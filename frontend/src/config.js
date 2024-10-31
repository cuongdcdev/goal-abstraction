const contractPerNetwork = {
  mainnet: process.env.NEXT_PUBLIC_CONTRACT_MAINNET,
  testnet: process.env.NEXT_PUBLIC_CONTRACT_TESTNET,
};


export const NetworkId = process.env.NEXT_PUBLIC_NETWORK_ID;
export const GoForItNearContract = contractPerNetwork[NetworkId];
export const ServerEndpoint = process.env.NEXT_PUBLIC_SERVER_ENDPOINT;
