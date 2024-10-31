
import { useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { NearContext } from '@/wallets/near';
import { GoForItNearContract } from '@/config';
import { utils } from "near-api-js";
import { getPrizeBalance, generateAddress, finalizeChallenge } from "@/utils";
import styles from '@/styles/fireworks.module.css';
// import { FaEthereum, FaDogecoin } from 'react-icons/fa';
import { SiNear, SiDogecoin, SiEthereum } from 'react-icons/si';



export default function ChallengeDetailPage() {


  const router = useRouter();
  const { id } = router.query;
  const { signedAccountId, wallet } = useContext(NearContext);
  const [exchangeRates, setExchangeRates] = useState({ NEAR: 5, ETH: 2800, DOGE: 0.1 });
  const [isSupervisor, setIsSupervisor] = useState(false);

  const [challengeObj, setChallengeObj] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prizeBalance, setPrizeBalance] = useState(0);
  const [depositAddr, setDepositAddr] = useState('');

  const [finalizeTxHash, setFinalizeTxHash] = useState('');
  const [finalizeError, setFinalizeError] = useState(null);
  const [loadingFinalize, setLoadingFinalize] = useState(false);
  const formatDeadline = (timestampnano) => {
    const date = new Date(timestampnano / 1000000); // Convert from nanoseconds to milliseconds
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    return {
      date: date.toLocaleString(),
      remaining: diffTime < 0 ? 'Deadline passed' : `${diffDays} days, ${diffHours} hours, and ${diffMinutes} minutes remaining`
    };
  };

  const getExplorerUrl = ({ address, txHash, chain = challengeObj.chain }) => {
    switch (chain.toLowerCase()) {
      case "near": return address ? `https://testnet.nearblocks.io/address/${address}` : `https://testnet.nearblocks.io/txns/${txHash}`;
      case "ethereum": return address ? `https://sepolia.etherscan.io/address/${address}` : `https://sepolia.etherscan.io/tx/${txHash}`;
      case "base": return address ? `https://sepolia.basescan.org/address/${address}` : `https://sepolia.basescan.org/tx/${txHash}`;
      case "arbitrum": return address ? `https://arbiscan.io/address/${address}` : `https://arbiscan.io/tx/${txHash}`;
      case "dogecoin": return address ? `https://www.oklink.com/doge/address/${address}` : `https://www.oklink.com/doge/tx/${txHash}`;
    }
  }

  // const checkPrize = async () => {
  //   let p = await getPrizeBalance(depositAddr, challengeObj.chain);
  //   console.log("check prize: ", p);
  //   p?.status == "success" && setPrizeBalance(parseFloat(p?.balance));
  // }

  const [prizeProp, setPrizeProp] = useState({
    prize: 0,
    token: '',
    prizeUSD: 0,
  });

  //fetch exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const [nearResponse, ethResponse, dogeResponse] = await Promise.all([
          fetch('https://api.coinbase.com/v2/exchange-rates?currency=NEAR'),
          fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH'),
          fetch('https://api.coinbase.com/v2/exchange-rates?currency=DOGE'),
        ]);
        const nearData = await nearResponse.json();
        const ethData = await ethResponse.json();
        const dogeData = await dogeResponse.json();
        setExchangeRates({
          NEAR: parseFloat(nearData.data.rates.USD),
          ETH: parseFloat(ethData.data.rates.USD),
          DOGE: parseFloat(dogeData.data.rates.USD)
        });
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };

    fetchExchangeRates();
  }, []);

  useEffect(() => {
    console.log("signedAccountId: ", signedAccountId);

    //TODO: just a test! remove this later
    // setIsSupervisor(true);

    if (signedAccountId && challengeObj && signedAccountId == challengeObj.judger) {
      setIsSupervisor(true);
    }
  }, [signedAccountId, challengeObj])

  //set prizeProp when challengeObj is set
  useEffect(() => {
    if (!challengeObj) return;

    console.log("challengeObj: ", challengeObj);
    var token = "DOGE";
    switch (challengeObj.chain) {
      case "NEAR":
        token = "NEAR";
        break;
      case "Arbitrum":
      case "Base":
      case "Ethereum":
        token = "ETH";
        break;
      default:
        token = "DOGE";
    }
    setPrizeProp({
      prize: challengeObj.chain == "NEAR" ? utils.format.formatNearAmount(challengeObj.prize) : challengeObj.prize,
      token: token,
      prizeUSD: parseFloat(challengeObj.chain == "NEAR" ? utils.format.formatNearAmount(challengeObj.prize) : challengeObj.prize) * exchangeRates[token]
    });
    console.log("prizeProp: ", prizeProp);

  }, [challengeObj]);

  // init   
  useEffect(() => {
    const init = async () => {
      if (!id) return; // Guard clause for when id is not yet available

      setIsLoading(true);
      setError(null);
      try {
        const challenge = await wallet.viewMethod({
          contractId: GoForItNearContract,
          method: 'get_challenge_by_id',
          args: { id }
        });

        setChallengeObj(challenge);
        let depositAddr = await generateAddress(challenge.id, challenge.chain);
        depositAddr?.status == "success" && setDepositAddr(depositAddr?.data?.address);
        console.log("depositAddr: ", depositAddr);

        if (challenge && challenge.chain != "Dogecoin") {
          let prizeBalanceObject = await getPrizeBalance(depositAddr?.data?.address, challenge.chain);
          console.log("chain now : ", challenge, "| prizeBalanceObject: ", prizeBalanceObject);
          prizeBalanceObject?.status == "success" && setPrizeBalance(parseFloat(prizeBalanceObject?.balance));
        }
      } catch (err) {
        console.error('Failed to fetch challenge:', err);
        setError('Failed to load challenge details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    init();

  }, [id, wallet]);

  //start to finalize the challenge automatically
  useEffect(() => {
    console.log("prizeBalance changed: ", prizeBalance);
    if (prizeBalance > 0 && challengeObj?.status !== "Open") {
      //start to finalize challenge
      //delay 5s to make sure the prize balance is updated
      setTimeout(async () => {
        const challenge = challengeObj;
        if (challenge.status == "ClosedSuccess" || challenge.status == "ClosedFailed") {
          console.log("start to finalize challenge: ", challenge.status, "prizeBalance", prizeBalance, " | challenge.prize: ", parseFloat(challenge.prize), " | ", (prizeBalance >= parseFloat(challenge.prize)));
          // if(true){
          if (challenge.chain !== "Dogecoin" && prizeBalance && (prizeBalance >= parseFloat(challenge.prize))) {
            setLoadingFinalize(true);
            let final = await finalizeChallenge(challenge.id);
            //  let dummydata = {
            //   "result": {
            //       "status": "success",
            //       "data": {
            //           "txHash": "0xe1aae83d0d0d3d4e2a2482dad161f1b0a96203cc4fe83fa76d07139691bcb9dc",
            //           "explorer": "https://sepolia.basescan.org//tx/0xe1aae83d0d0d3d4e2a2482dad161f1b0a96203cc4fe83fa76d07139691bcb9dc"
            //       }
            //   },
            //     "status": "success"
            //   }
            setLoadingFinalize(false);
            console.log("finalize challenge", final);
            if (final?.status == "success" && final?.result?.status == "success") {
              setFinalizeTxHash(final?.result?.data?.txHash);
              final?.result.status == "failed" && setFinalizeError("something wrong during transfer prize: " + final?.result + " | " + final?.result?.data);
              // setFinalizeTxHash("xxxxxxx");
            } else {
              console.error("something wrong when finalizing challenge, please contact support: " + final?.error);
              final && setFinalizeError("something wrong during transfer prize: " +
                (final?.error ? final.error + " | " : "") +
                (final?.result ? final.result + " | " : "") +
                (final?.result?.data ? final.result.data : ""));
            }
          } else if (challenge.chain == "Dogecoin") {
            //NOTE: for dogecoin
            setLoadingFinalize(true);
            let final = await finalizeChallenge(challenge.id);
            //dummy data for testing
            // let final = {
            //     "result": {
            //         "status": "success",
            //         "txHash": "65eba11da97046d668e1e83d1b49517c39d30564cb6623e25766e7506dbdaf87",
            //         "explorerLink": "https://blockexplorer.one/dogecoin/mainnet/tx/65eba11da97046d668e1e83d1b49517c39d30564cb6623e25766e7506dbdaf87",
            //         "message": "Transaction broadcast successfully. It might take few minutes for transaction to be included in mempool"
            //     },
            //     "status": "success"
            // }

            setLoadingFinalize(false);
            console.log("finalize challenge", final);
            if (final?.result?.status == "success") {
              setFinalizeTxHash(final?.result?.txHash);
              // setFinalizeTxHash("xxxxxxx");
            } else {
              console.error("something wrong when finalizing challenge: ", final);
              // final && setFinalizeError("something wrong during transfer prize: " + final?.result?.message
              //   + final?.result?.message.includes("-Infinity") ? "maybe the prize has been transferred" : ""
              // );
            }
          }
        }
      }, 2000);
    }
  }, [prizeBalance, challengeObj]);



  const handleConfirmChallenge = async (status) => {
    let args = {
      id: challengeObj.id,
      status: status
    }

    try {
      let rs = await wallet.callMethod({
        contractId: GoForItNearContract,
        method: 'finalize',
        args: args,
      });
      console.log("rs: ", rs);
      window.location.href = window.location.href;
    } catch (e) {
      console.log("error e: ", e);
    }
  }

  const EmojiRain = ({ emoji, count = 30 }) => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100, // Random horizontal position
        animationDuration: 3 + Math.random() * 3, // Random duration between 3-6s
        delay: Math.random() * 5, // Random delay up to 5s
      }));
      setParticles(newParticles);

      // Create new particles every 10 seconds
      const interval = setTimeout(() => {
        setParticles(prev => [
          ...prev,
          ...Array.from({ length: count / 2 }, (_, i) => ({
            id: Date.now() + i,
            left: Math.random() * 100,
            animationDuration: 5 + Math.random() * 5,
            delay: 0,
          }))
        ]);
      }, 1000);

      // Cleanup
      return () => {
        clearInterval(interval);
      };
    }, [count]);

    // Clean up old particles
    useEffect(() => {
      const cleanup = setInterval(() => {
        setParticles(prev => prev.slice(-count));
      }, 10000);

      return () => clearInterval(cleanup);
    }, [count]);

    return (
      <div className={styles.fireworkContainer}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={styles.particle}
            style={{
              left: `${particle.left}%`,
              animationDuration: `${particle.animationDuration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    );
  };

  const shareToTwitter = useCallback(() => {
    const tweetText = encodeURIComponent(
      challengeObj.status === "ClosedSuccess"
        ? `🎉 I just completed my challenge "${challengeObj.title}" on GoForIt!\n` +
        `Prize: ${prizeProp.prize} ${prizeProp.token} (≈$${prizeProp.prizeUSD.toFixed(2)} USD)\n\n` +
        `Set your own challenges at: ${window.location.origin}`
        : `😢 I didn't complete my challenge "${challengeObj.title}" on GoForIt\n` +
        `But I'll keep trying! Set your own challenges at: ${window.location.origin}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
  }, [challengeObj, prizeProp]);

  if (isLoading) return <div className="container py-5">Loading challenge details...</div>;
  if (error) return <div className="container py-5 text-danger">{error}</div>;
  if (!challengeObj) return (<div className="container py-5">Challenge not found...</div>);

  return (
    <>

      {challengeObj.status === "ClosedSuccess" && (
        <>
          <EmojiRain emoji="🎉" count={20} />
          <EmojiRain emoji="⭐" count={15} />
          <EmojiRain emoji="🌟" count={15} />
        </>
      )}
      {challengeObj.status === "ClosedFailed" && (
        <>
          <EmojiRain emoji="💔" count={20} />
          <EmojiRain emoji="😢" count={15} />
        </>
      )}

      <div className="container py-5">
        <div className="card shadow-lg" style={{ background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)' }}>
          <div className="card-body p-4">
            <div className="mb-4">
              {/* Challenge Title Section */}
              <div className="review-section p-4 rounded mb-4"
                style={{ background: 'rgba(13, 110, 253, 0.05)', borderLeft: '4px solid #0d6efd' }}>
                <h5 className="text-primary mb-3 d-flex align-items-center">
                  <span className="fs-4 me-2">🎯</span>
                  {challengeObj.title}
                </h5>
                <p className="ms-4 mb-0 fw-bold">{challengeObj.description}</p>
              </div>

              {/* Deadline Section */}
              <div className="review-section p-3 rounded mb-4"
                style={{ background: 'rgba(25, 135, 84, 0.05)', borderLeft: '4px solid #198754' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-clock-history fs-5 me-2 text-success"></i>
                    <span className="fw-bold">Deadline: {formatDeadline(challengeObj.expire)?.date}</span>
                  </div>
                  <div className={`${Date.now() * 1000000 >= challengeObj.expire ? 'text-danger' : 'text-muted'} small`}>
                    <i className="bi bi-alarm me-1"></i>
                    {formatDeadline(challengeObj.expire)?.remaining}
                  </div>
                </div>
              </div>

              {/* Prize Details Section */}
              <div className="review-section p-4 rounded mb-4"
                style={{ background: 'rgba(255, 193, 7, 0.05)', borderLeft: '4px solid #ffc107' }}>
                <h5 className="text-warning mb-4 d-flex align-items-center">
                  <i className="bi bi-trophy-fill fs-4 me-2"></i>
                  Prize Details
                </h5>
                <div className="ms-4 d-flex align-items-center mb-3">
                  {challengeObj.chain === "NEAR" && <SiNear size={24} className="me-2" />}
                  {["Arbitrum", "Base", "Ethereum"].includes(challengeObj.chain) && <SiEthereum size={24} className="me-2" />}
                  {challengeObj.chain === "Dogecoin" && <SiDogecoin size={24} className="me-2" />}
                  <span className="fs-3 fw-bold">{prizeProp.prize} {prizeProp.token}</span>
                  <span className="text-muted ms-3">≈ ${prizeProp.prizeUSD.toFixed(2)} USD</span>
                </div>
                <div className="ms-4 mb-3">
                  <span className="badge bg-secondary">{challengeObj.chain} Network</span>
                </div>

                {
                  challengeObj.status === "Open" && <>
                    <div className="mb-2">
                      <strong>🎉 When you CRUSH this challenge, the prize goes to: </strong>
                      <span className="text-break fw-bold text-success">{challengeObj.success_addr}</span>
                    </div>
                    <div>
                      <strong>😤 If things don't work out, funds go to: </strong>
                      <span className="text-break text-danger">{challengeObj.failed_addr}</span>
                    </div>
                  </>

                }



                <div className="review-section p-2 bg-light rounded d-flex align-items-center mb-3">
                  <h6 className="text-primary mb-0 me-2">👥 Supervisor:</h6>
                  <p className="mb-0">{challengeObj.judger}</p>
                </div>



                {(challengeObj.status === "ClosedSuccess" || challengeObj.status === "ClosedFailed") && (
                  <div className="review-section p-3 bg-light rounded mt-3 position-relative">
                    {/* <h5 className="text-primary mb-3">📋 Challenge Status</h5> */}
                    {challengeObj.status === "ClosedSuccess" ? (
                      <div className="alert alert-success mb-3">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Challenge completed successfully! Prize sent to success address: {challengeObj.success_addr}
                        <br />
                        <a href={getExplorerUrl({ address: challengeObj.success_addr })} target="_blank" className="btn btn-outline-secondary btn-sm opacity-75" style={{ fontSize: "0.8rem" }}>View on Explorer</a>
                      </div>
                    ) : (
                      <div className="alert alert-danger mb-0">
                        <i className="bi bi-x-circle-fill me-2"></i>
                        Challenge failed. Prize sent to failure address: {challengeObj.failed_addr} <br />
                        <a href={getExplorerUrl({ address: challengeObj.failed_addr })} target="_blank" className="btn btn-outline-secondary btn-sm opacity-75" style={{ fontSize: "0.8rem" }}>View on Explorer</a>
                      </div>
                    )}
                    <button
                      onClick={shareToTwitter}
                      className="btn btn-primary w-100 mt-3"
                    >
                      <i className="bi bi-twitter me-2 "></i>
                      Share on X
                    </button>
                  </div>
                )}


                {
                  finalizeError && (
                    <small className="text-warning">❌ {finalizeError}</small>
                  )
                }



                {challengeObj.status === "Open" && (
                  <div className="review-section p-3 bg-light rounded mt-3">
                    {/* <h5 className="text-primary mb-3">📋 Challenge Status</h5> */}
                    <div className=" mb-0">
                      <i className="bi bi-hourglass me-2 animate-spin"></i>
                      Challenge is currently open and in progress. The supervisor [{challengeObj.judger}] will verify the outcome after the deadline.
                    </div>

                    {
                      challengeObj.chain !== "NEAR" && challengeObj.status === "Open" && (
                        <div className="alert alert-info mt-3">
                          <i className="bi bi-info-circle-fill me-2"></i>
                          Put your money where your mouth is! 💪 <br />
                          {prizeBalance < prizeProp.prize && (
                            <>
                              To ensure the prize can be distributed after challenge completion,
                              transfer total of {prizeProp.prize} {prizeProp.token} ({challengeObj.chain} network) to: <br />
                            </>
                          )}

                          <div className="d-flex align-items-center">
                            <div className="d-flex flex-wrap align-items-center w-100">
                              <code className="ms-2 p-2 bg-light border rounded my-2 text-break" style={{ maxWidth: "100%", overflowWrap: "break-word" }}>{depositAddr}</code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(depositAddr) }}
                                className="btn btn-secondary btn-sm ms-2 shadow-sm my-2"
                                style={{ fontSize: "0.8rem", minWidth: "80px" }}
                              >
                                <i className="bi bi-clipboard me-1"></i>
                                Copy
                              </button>
                            </div>

                          </div>

                          <div className="mt-2">
                            {
                              challengeObj.chain !== "Dogecoin" && <div className="text-secondary opacity-75 mt-1" style={{ fontSize: "0.8rem" }}>
                                Current wallet balance: {prizeBalance} {prizeProp.token}
                              </div>
                            }
                            <a target="_blank"
                              href={getExplorerUrl({ address: depositAddr })}
                              className="btn btn-outline-secondary btn-sm "
                              style={{ fontSize: "0.8rem" }}
                            >
                              View on Explorer
                            </a>
                          </div>

                        </div>
                      )
                    }
                  </div>
                )}

                {
                  isSupervisor && challengeObj.status === "Open" && (
                    <div className="review-section p-3 rounded mt-4"
                      style={{ background: 'rgba(13, 110, 253, 0.05)', border: '2px solid #0d6efd', boxShadow: '0 4px 15px rgba(13, 110, 253, 0.1)' }}>
                      <h5 className="text-primary text-center mb-3">
                        <i className=" fs-4 me-2"></i>
                        Challenge Verification
                      </h5>
                      <div className="d-flex flex-column flex-md-row justify-content-center gap-2 gap-md-4">
                        <button
                          className="btn btn-success px-3 py-2"
                          style={{
                            transition: 'all 0.3s',
                            transform: 'scale(1)',
                            ':hover': { transform: 'scale(1.05)' }
                          }}
                          disabled={Date.now() * 1000000 < challengeObj.expire}
                          onClick={() => handleConfirmChallenge("ClosedSuccess")}>
                          <i className="bi bi-check-circle-fill me-2"></i>
                          Confirm Success
                        </button>
                        <button
                          className="btn btn-danger px-3 py-2"
                          style={{
                            transition: 'all 0.3s',
                            transform: 'scale(1)',
                            ':hover': { transform: 'scale(1.05)' }
                          }}
                          disabled={Date.now() * 1000000 < challengeObj.expire}
                          onClick={() => handleConfirmChallenge("ClosedFailed")}>
                          <i className="bi bi-x-circle-fill me-2"></i>
                          Mark as Failed
                        </button>
                      </div>
                    </div>
                  )
                }
                {challengeObj.chain === "Dogecoin" && (
                  <p className="text-secondary opacity-75 mt-1" style={{ fontSize: "0.8rem" }}>
                    <i className="bi bi-info-circle me-1"></i>
                    Note: Dogecoin transactions may take up to 10 minutes to confirm
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* toast */}
        {loadingFinalize && (
          <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
            <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
              <div className="toast-header">
                <i className="bi bi-hourglass-split me-2"></i>
                <strong className="me-auto">Processing</strong>
              </div>
              <div className="toast-body">
                Distributing prize, please wait, may take up to 30 seconds...
              </div>
            </div>
          </div>
        )}

        {
          finalizeTxHash && (
            <div
              id="toast-container"
              className="position-fixed bottom-0 end-0 p-3"
              style={{ zIndex: 99, display: 'block' }}
            >
              <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div className="toast-header">
                  <i className="bi bi-box-arrow-up-right me-2"></i>
                  <strong className="me-auto">Prize is distributed</strong>
                  <button
                    type="button"
                    id="toast-close"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      document.getElementById('toast-container').style.display = 'none';
                    }}
                  ></button>
                </div>
                <div className="toast-body">
                  <a
                    href={getExplorerUrl({ txHash: finalizeTxHash })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none"
                  >
                    Prize is distributed. View transaction on Explorer.
                    <i className="bi bi-arrow-up-right ms-2"></i>
                  </a>
                  <br />
                  {challengeObj.chain === "Dogecoin" && <span className="text-secondary opacity-75 mt-1" style={{ fontSize: "0.8rem" }}>
                    <i className="bi bi-info-circle me-1"></i>
                    Note: Dogecoin transactions may take up to 10 minutes to showup, please wait
                  </span>}
                </div>
              </div>
            </div>
          )
        }
        {/* end toast */}
      </div>
    </>
  )
}

