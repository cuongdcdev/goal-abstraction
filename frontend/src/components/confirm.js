export default function ConfirmScreen({ goalProp, deadlineProp, prizeProp, supervisorProp, confirmProp }) {
    const formatDeadline = () => {
        const date = new Date(deadlineProp / 1000000); // Convert from nanoseconds to milliseconds
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        return {
            date: date.toLocaleString(),
            remaining: `${diffDays} days, ${diffHours} hours, and ${diffMinutes} minutes remaining`
        };
    };

    const deadline = formatDeadline();

    return (
        <div className="container py-5">
            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <h2 className="card-title text-center mb-4">Review Your Challenge</h2>

                    <div className="mb-4">
                        <div className="review-section p-3 bg-light rounded mb-3">
                            <h5 className="text-primary mb-3">🎯 {goalProp.goal}</h5>
                            <div>
                                <strong><p className="ms-3 mb-0">{goalProp.goalDescription}</p></strong>
                            </div>
                        </div>

                        <div className="review-section p-3 bg-light rounded mb-3">
                            <h5 className="text-primary mb-3">⏰ Deadline</h5>
                            <div className="mb-2">
                                <strong>Due Date:</strong> 
                                <p className="ms-3 mb-2">{deadline.date}</p>
                            </div>
                            <div className="text-muted">
                                <i className="bi bi-clock me-2"></i>
                                {deadline.remaining}
                            </div>
                        </div>

                        <div className="review-section p-3 bg-light rounded mb-3">
                            <h5 className="text-primary mb-3">💰 Prize Details</h5>
                            <div className="mb-2">
                                <strong>Amount:</strong>
                                <p className="ms-3 mb-2">
                                    {prizeProp.prize} {prizeProp.token}
                                    <span className="text-muted ms-2">
                                        (≈ ${prizeProp.prizeUSD} USD)
                                    </span>
                                </p>
                            </div>
                            <div className="mb-2">
                                <strong>Network:</strong>
                                <p className="ms-3 mb-2">{prizeProp.chain}</p>
                            </div>
                            <div className="mb-2">
                                <strong>Success Address:</strong>
                                <p className="ms-3 mb-2 text-break">{prizeProp.successAddress}</p>
                            </div>
                            <div>
                                <strong>Failure Address:</strong>
                                <p className="ms-3 mb-0 text-break">{prizeProp.failureAddress}</p>
                            </div>
                        </div>

                        <div className="review-section p-3 bg-light rounded">
                            <h5 className="text-primary mb-3">👥 Supervisor</h5>
                            <p className="mb-0 text-break">{supervisorProp}</p>
                        </div>
                    </div>

                    <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Please review all details carefully. Once confirmed, the challenge cannot be modified.
                    </div>

                    <div className="text-center">
                        <button 
                            className="btn btn-primary btn-lg"
                            onClick={confirmProp}
                        >
                            <i className="bi bi-check-circle me-2"></i>
                            JUST DO IT!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
