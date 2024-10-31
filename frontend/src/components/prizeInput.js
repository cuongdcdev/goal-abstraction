import { useState, useEffect } from 'react';

const PrizeInput = ({ setPrizeProp, defaultPrize }) => {
    const [prize, setInputPrize] = useState(defaultPrize.prize || 0);
    const [exchangeRates, setExchangeRates] = useState({ NEAR: 5, ETH: 2800, DOGE: 0.1 });
    const [successAddress, setSuccessAddress] = useState(defaultPrize.successAddress || '');
    const [failureAddress, setFailureAddress] = useState(defaultPrize.failureAddress || '');
    const [currentChain, setCurrentChain] = useState(defaultPrize.chain || 'NEAR');
    const [currentToken, setCurrentToken] = useState(defaultPrize.token || 'NEAR');
    const [successAddressError, setSuccessAddressError] = useState('');
    const [failureAddressError, setFailureAddressError] = useState('');
    const [prizeError, setPrizeError] = useState('');

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
        if (successAddress) {
            setSuccessAddressError(validateAddress(successAddress, currentChain));
        }
        if (failureAddress) {
            setFailureAddressError(validateAddress(failureAddress, currentChain));
        }
    }, [currentChain]);

    const calculateUSD = (amount) => {
        return (parseFloat(amount) * exchangeRates[currentToken]).toFixed(2);
    };

    const chains = [
        { id: 'NEAR', name: 'NEAR', icon: '🌈', token: 'NEAR' },
        { id: 'Base', name: 'Base', icon: '🔵', token: 'ETH' },
        { id: 'Ethereum', name: 'Ethereum', icon: '🔷', token: 'ETH' },
        { id: 'Dogecoin', name: 'Dogecoin', icon: '🐶', token: 'DOGE' }
    ];

    const presetAmounts = [5, 10, 20, 50, 100];

    const validateAddress = (address, chain) => {
        if (!address) return '';
        
        if (chain === 'Dogecoin') {
            return /^D[a-zA-Z0-9]{33}$/.test(address) 
                ? '' 
                : 'Invalid Dogecoin address format, must be Dogecoin mainnet address';
        } else if (chain === 'Base' || chain === 'Ethereum') {
            return /^0x[a-fA-F0-9]{40}$/.test(address)
                ? ''
                : 'Invalid ETH address format';
        } else if (chain === 'NEAR') {
            // Check for .near, .testnet, .tg endings
            const validNearEndings = /\.(near|testnet|tg)$/;
            // Check for implicit account ID (64 character hex)
            const validImplicitAccount = /^[a-f0-9]{64}$/;
            // Check for EVM addresses
            const validEvmAddress = /^0x[a-fA-F0-9]{40}$/;
            
            if (validNearEndings.test(address) || 
                validImplicitAccount.test(address) || 
                validEvmAddress.test(address)) {
                return '';
            }
            return 'Invalid NEAR address format';
        }
        return '';
    };

    const validatePrizeAmount = (amount, chain) => {
        if (!amount) return '';
        
        // Convert amount to a number and calculate USD value
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return 'Please enter a valid number';
        
        const usdValue = parseFloat(calculateUSD(amount));
        
        if (chain === 'Ethereum' && usdValue < 48 ) {
            return 'Minimum amount for Ethereum is $50 due to gas fees';
        } else if (chain === 'Dogecoin' && numAmount < 1) {
            return 'Minimum amount for Dogecoin is 1 DOGE';
        }
        return '';
    };

    const handlePrizeChange = (value) => {
        setInputPrize(value);
        // Make sure to pass both value and currentChain
        const error = validatePrizeAmount(value, currentChain);
        setPrizeError(error);
    };

    return (
        <div className="container py-5">
            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <h2 className="card-title text-center mb-4">Set Your Challenge Prize</h2>

                    <div className="mb-4">
                        <h5 className="text-muted mb-3">1. Select Blockchain Network</h5>
                        <div className="d-flex flex-wrap gap-2 justify-content-center">
                            {chains.map(chain => (
                                <button
                                    key={chain.id}
                                    className={`btn ${currentChain === chain.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => {
                                        setInputPrize('');
                                        setCurrentChain(chain.id);
                                        setCurrentToken(chain.token);
                                        setSuccessAddress('');
                                        setFailureAddress('');
                                        setSuccessAddressError('');
                                        setFailureAddressError('');
                                        setPrizeError('');
                                    }}
                                >
                                    {chain.icon} {chain.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <h5 className="text-muted mb-3">2. Set Prize Amount</h5>
                        <div className="input-group mb-3">
                            <span className="input-group-text">{currentToken}</span>
                            <input
                                type="number"
                                className={`form-control ${prizeError ? 'is-invalid' : ''}`}
                                placeholder={`Enter amount`}
                                value={prize}
                                onChange={(e) => handlePrizeChange(e.target.value)}
                                min={0}
                                step={0.01}
                            />
                            {prizeError && (
                                <div className="invalid-feedback">
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    {prizeError}
                                </div>
                            )}
                        </div>
                        
                        <div className="d-flex flex-wrap gap-2 justify-content-center mb-2">
                            {presetAmounts.map(amount => (
                                <button
                                    key={amount}
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        handlePrizeChange((amount / exchangeRates[currentToken]).toFixed(4));
                                        setInputPrize((amount / exchangeRates[currentToken]).toFixed(4));
                                    }}
                                >
                                    ${amount}
                                </button>
                            ))}
                        </div>
                        
                        {prize && (
                            <div className="text-center text-success">
                                ~ ${calculateUSD(prize)} USD
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <h5 className="text-muted mb-3">3. Set Addresses</h5>
                        <div className="alert alert-info">
                            Make sure to use valid {currentChain} addresses
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Success Address</label>
                            <input
                                type="text"
                                className={`form-control ${successAddressError ? 'is-invalid' : successAddress ? 'is-valid' : ''}`}
                                placeholder={`Enter ${currentChain} success address`}
                                value={successAddress}
                                onChange={(e) => {
                                    const address = e.target.value;
                                    setSuccessAddress(address);
                                    setSuccessAddressError(validateAddress(address, currentChain));
                                }}
                            />
                            {successAddressError ? (
                                <div className="invalid-feedback">
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    {successAddressError}
                                </div>
                            ) : successAddress && (
                                <div className="valid-feedback">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Valid address format
                                </div>
                            )}
                            <div className="form-text">
                                Funds will be sent here if you succeed
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Failure Address</label>
                            <input
                                type="text"
                                className={`form-control ${failureAddressError ? 'is-invalid' : failureAddress ? 'is-valid' : ''}`}
                                placeholder={`Enter ${currentChain} failure address`}
                                value={failureAddress}
                                onChange={(e) => {
                                    const address = e.target.value;
                                    setFailureAddress(address);
                                    setFailureAddressError(validateAddress(address, currentChain));
                                }}
                            />
                            {failureAddressError ? (
                                <div className="invalid-feedback">
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    {failureAddressError}
                                </div>
                            ) : failureAddress && (
                                <div className="valid-feedback">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Valid address format
                                </div>
                            )}
                            <div className="form-text">
                                Funds will be sent here if you fail
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            className="btn btn-primary btn-lg"
                            disabled={!prize || !successAddress || !failureAddress || successAddressError || failureAddressError || prizeError}
                            onClick={() => {
                                setPrizeProp({
                                    prize,
                                    prizeUSD: calculateUSD(prize),
                                    successAddress,
                                    failureAddress,
                                    chain: currentChain,
                                    token: currentToken
                                });
                            }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrizeInput;
