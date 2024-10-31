import { Wallet } from '@/wallets/near';
import { useState } from 'react';

const SupervisorInput = ({ setSupervisorProp, defaultAddress }) => {
    const [supervisor, setSupervisor] = useState(defaultAddress || '');
    //TODO: remove this hardcoded address
    const [supervisorError, setSupervisorError] = useState('');

    const validateNearAddress = (address) => {
        if (!address) return '';
        
        // Check for .near, .testnet, .tg endings
        const validNearEndings = /\.(near|testnet|tg)$/;
        // Check for implicit account ID (64 character hex)
        const validImplicitAccount = /^[a-f0-9]{64}$/;
        
        if (validNearEndings.test(address) || validImplicitAccount.test(address)) {
            return '';
        }
        return 'Invalid NEAR address';
    };

    return (
        <div className="container py-5">
            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <h2 className="card-title text-center mb-4">Who Checks If You Did It?</h2>

                    <div className="mb-4">
                        <div className="text-muted small mb-3">
                            <i className="bi bi-info-circle me-2"></i>
                            Choose someone who can verify your goal completion
                        </div>

                        <div className="input-container p-4 bg-light rounded border border-primary">
                            <label className="form-label h5 mb-3">Supervisor Address</label>
                            <input
                                type="text"
                                className={`form-control form-control-lg shadow-sm ${supervisorError ? 'is-invalid' : supervisor ? 'is-valid' : ''}`}
                                placeholder="NEAR wallet address"
                                value={supervisor}
                                onChange={(e) => {
                                    const address = e.target.value;
                                    setSupervisor(address);
                                    setSupervisorError(validateNearAddress(address));
                                }}
                            />
                            {supervisorError ? (
                                <div className="invalid-feedback">
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    {supervisorError}
                                </div>
                            ) : supervisor && (
                      <></>
                            )}
                            <div className="form-text mt-2 small">
                                <i className="bi bi-shield-check me-1"></i>
                                Must be a valid NEAR address
                            </div>
                        </div>

                        <div className="text-muted small mt-3">
                            <i className="bi bi-exclamation-circle me-2"></i>
                            They'll need this NEAR wallet to confirm your completion
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            className="btn btn-primary btn-lg"
                            disabled={!supervisor.trim() || supervisorError}
                            onClick={() => setSupervisorProp(supervisor)}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupervisorInput;
