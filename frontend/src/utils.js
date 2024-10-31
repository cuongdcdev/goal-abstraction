import { ServerEndpoint } from "./config";

/**
 * Get the prize balance of a challenge, support NEAR and EVM for now
 * @param {*} challengeId 
 * @param {*} chain 
 * @returns 
 */
export const getPrizeBalance = async (challengeId, chain) => {
    let c = "base";

    switch (chain.toLowerCase()) {
        case "ethereum":
            c = "ETH";
            break;

        case "base":
            c = "BASE";
            break;

        case "dogecoin":
            c = "DOGE";
            break;

        default:
            c = "BASE";
    }
    const response = await fetch(`${ServerEndpoint}/get-balance/${c}/${challengeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    return data;
}

/**
 * Support NEAR addresses and EVM ddresses for now
 * @param {*} challengeId 
 * @param {*} chain 
 * @returns 
 */
export const generateAddress = async (challengeId, chain) => {
    let c = "Ethereum";
    switch (chain.toLowerCase()) {
        case "dogecoin":
            c = "DOGE";
            break;

        case "ethereum":
        case "base":
            c = "ETH";
            break;

        default:
            c = "ETH";
    }
    const response = await fetch(`${ServerEndpoint}/gen-address/${c}/${challengeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    return data;
}

export const finalizeChallenge = async (challengeId) => {
    const response = await fetch(`${ServerEndpoint}/finalize/${challengeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    return data;
}




