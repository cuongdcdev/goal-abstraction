import { useState } from 'react';
import { SiNear } from 'react-icons/si';
const GoalInput = ({ setGoalProp, defaultGoal, wallet, signedAccountId }) => {
    const [goal, setGoal] = useState(defaultGoal.goal || '');
    const [goalDescription, setGoalDescription] = useState(defaultGoal.goalDescription || '');

    return (
        <div className="container py-5">
            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <h2 className="card-title text-center mb-4">Set a Goal, Stick to It! <br/> <i>or Pay the Price 💸!</i>                    </h2>

                    <div className="mb-4">
                        <h5 className="text-muted mb-3">1. What do you want to achieve?</h5>
                        <div className="mb-3">
                            <input
                                type="text"
                                className="form-control form-control-lg"
                                placeholder="I will..."
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label text-muted">
                                <i className="bi bi-info-circle me-2"></i>
                                Add more details about your goal
                            </label>
                            <textarea
                                className="form-control"
                                rows="4"
                                placeholder="Describe your goal in detail (e.g., Exercise for at least 30 minutes every day)"
                                value={goalDescription}
                                onChange={(e) => setGoalDescription(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="alert alert-info" role="alert">
                        <i className="bi bi-lightbulb me-2"></i>
                        <strong>Tip:</strong> Make your goal specific, measurable, and achievable within the timeframe.
                    </div>

                    <div className="text-center">
                        {
                            signedAccountId ? (<button
                                className="btn btn-primary btn-lg"
                                disabled={!goal.trim()}
                                onClick={() => setGoalProp({ goal, goalDescription })}
                            >
                                Continue
                            </button>) : (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => wallet.signIn()}
                                >
                                    <SiNear className="me-2" />
                                    Login To Continue
                                </button>
                            )
                        }

                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalInput;
