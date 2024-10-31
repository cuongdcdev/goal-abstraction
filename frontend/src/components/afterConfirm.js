import React, { useEffect } from 'react';

const AfterConfirm = ({ challengeId, errorCode, txHash }) => {
    const challengeUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/id/${challengeId}`
        : '';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(challengeUrl);
    };

    const shareChallenge = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Check out my GoForIt Challenge!',
                text: 'I just created a new challenge. Come check it out!',
                url: challengeUrl
            });
        } else {
            const tweetText = encodeURIComponent('Check out my GoForIt Challenge! I just created a new challenge. Come check it out!');
            const tweetUrl = encodeURIComponent(challengeUrl);
            const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;
            window.open(twitterUrl, '_blank');
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const container = document.getElementById('toast-container');
            if (container) {
                container.style.display = 'none';
            }
        }, 10000);

        document.getElementById('toast-close')?.addEventListener('click', () => {
            const container = document.getElementById('toast-container');
            if (container) {
                container.style.display = 'none';
            }
        });
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="container py-5">
            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <div className="text-center">
                        {errorCode ? (
                            <div className="mb-4">
                                <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: "64px" }}></i>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "64px" }}></i>
                            </div>
                        )}

                        <h2 className="mb-3">
                            {errorCode ? "Challenge Creation Cancelled" : "Challenge Created Successfully! 🎉"}
                        </h2>

                        <p className="text-muted mb-4">
                            {errorCode 
                                ? "Your challenge creation was cancelled. Please try again." 
                                : "Your challenge is now live and ready to be conquered! Share it with your supervisor to get started."}
                        </p>

                        <p className="text-muted mb-4">
                            {!errorCode && "Click on the link below to view your challenge and deposit the prize as a commitment! 💪💪"}
                        </p>

                        {errorCode ? (
                            <div className="mb-4">
                                <div className="alert alert-danger">
                                    <strong>Error Code:</strong> {errorCode}
                                </div>
                                <a href="/" className="btn btn-primary btn-lg">
                                    Create a new one
                                </a>
                            </div>
                        ) : (
                            <>
                                
                                <div className="mb-4">
                                    <div className="card bg-light">
                                        <div className="card-body">
                                            <div className="d-flex align-items-center gap-2">
                                                <a href={challengeUrl} target="_blank" rel="noopener noreferrer">
                                                    <code className="flex-grow-1 text-break fs-6">{challengeUrl}</code>
                                                </a>
                                                <button
                                                    id="btn-clipboard"
                                                    className="btn btn-outline-primary"
                                                    onClick={() => {
                                                        copyToClipboard();
                                                        const btn = document.querySelector('#btn-clipboard i');
                                                        btn.className = 'bi bi-clipboard-check';
                                                        setTimeout(() => {
                                                            btn.className = 'bi bi-clipboard';
                                                        }, 5000);
                                                    }}
                                                    title="Copy to clipboard"
                                                >
                                                    <i className="bi bi-clipboard"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-center gap-3 mb-4">
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={shareChallenge}
                                    >
                                        <i className="bi bi-share me-2"></i>
                                        Share Challenge
                                    </button>

                                    <a href="/" className="btn btn-outline-primary btn-sm">
                                        New Challenge
                                    </a>
                                </div>

                                <div className="alert alert-info">
                                    <i className="bi bi-info-circle me-2"></i>
                                    Remember: Your supervisor needs to confirm your challenge completion.  Send them the link above.
                                </div>

                                {txHash && (
                                    <div 
                                        id="toast-container" 
                                        className="position-fixed bottom-0 end-0 p-3" 
                                        style={{ zIndex: 99, display: 'block' }}
                                    >
                                        <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                                            <div className="toast-header">
                                                <i className="bi bi-box-arrow-up-right me-2"></i>
                                                <strong className="me-auto">View on Explorer</strong>
                                                <button
                                                    type="button"
                                                    id="toast-close"
                                                    className="btn-close"
                                                    aria-label="Close"
                                                ></button>
                                            </div>
                                            <div className="toast-body">
                                                <a
                                                    href={`https://testnet.nearblocks.io/txns/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-decoration-none"
                                                >
                                                    View transaction on NEAR Explorer
                                                    <i className="bi bi-arrow-up-right ms-2"></i>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AfterConfirm;