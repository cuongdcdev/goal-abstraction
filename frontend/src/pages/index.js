import { useEffect, useState, useContext } from 'react';
import { GoForItNearContract } from '@/config';
import { NearContext } from '@/wallets/near';
import { utils } from 'near-api-js';

// import NearLogo from '/public/near.svg';
// import styles from '@/styles/app.module.css';
// import { PageCreate } from './create';
import GoalInput from '@/components/goalInput';
import DateInput from '@/components/dateInput';
import PrizeInput from '@/components/prizeInput';
import SupervisorInput from '@/components/supervisorInput';
import ConfirmScreen from '@/components/confirm';
import AfterConfirm from '@/components/afterConfirm';
import { useSearchParams } from 'next/navigation';



export default function Home() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState({
    goal: '',
    goalDescription: ''
  });


  const [nearErrorCode, setNearErrorCode] = useState('');
  const [nearTxhash, setNearTxhash] = useState('');
  const [nearCreatedChallengeId, setNearCreatedChallengeId] = useState('');

  const [deadline, setDeadline] = useState(Date.now() * 1000000 + 24 * 60 * 60 * 1000 * 1000000); // Tomorrow in nanoseconds
  const [prizeOject, setPrizeObject] = useState({
    prize: '',
    prizeUSD: 0,
    successAddress: '',
    failureAddress: '',
    chain: 'NEAR',
    token: 'NEAR'
  });
  const [supervisor, setSupervisor] = useState('');

//NEAR integration 
const { signedAccountId, wallet } = useContext(NearContext);


  useEffect(() => {
    console.log("wallet changed: ", wallet);
  }, [wallet])


  useEffect(() => {
    searchParams.get('errorCode') ? setNearErrorCode(searchParams.get('errorCode')) : '';
    searchParams.get('transactionHashes') ? setNearTxhash(searchParams.get('transactionHashes')) : '';

    console.log("errcode: ", nearErrorCode);
    console.log("txhash: ", nearTxhash);

    if (nearCreatedChallengeId || nearTxhash || nearErrorCode) {
      setStep(6);
      if (nearTxhash) {
        (async () => {
          let cid = await wallet.getTransactionResult(nearTxhash);
          console.log("challenge cid: ", cid);
          setNearCreatedChallengeId(cid);
        })();
      }
    } else {
      setStep(1);
    }
  }, [nearErrorCode, nearTxhash, searchParams, nearCreatedChallengeId])

  // // handle success case 
  // useEffect(() => {

  //   console.log("nearCreatedChallengeId: ", nearCreatedChallengeId);
  //   console.log("nearTxhash: ", nearTxhash);
  //   if (nearCreatedChallengeId || nearTxhash) {
  //     setStep(6);
  //   }

  // }, [nearCreatedChallengeId])


  const createChallenge = async () => {
    console.log("setting challenge: ", goal);
    let cobj = {
      title: goal.goal,
      description: goal.goalDescription,
      expire: deadline,
      chain: prizeOject.chain,
      prize:  prizeOject.chain === 'NEAR' ?  utils.format.parseNearAmount(prizeOject.prize): prizeOject.prize,
      judger: supervisor,
      success_addr: prizeOject.successAddress,
      failed_addr: prizeOject.failureAddress
    };
    console.log("calling NEAR contract with args: ", cobj);
    console.log("deposit: ", prizeOject.chain === 'NEAR' ? utils.format.parseNearAmount(String(prizeOject.prize)) : utils.format.parseNearAmount('0.0000000000001'));
    return await wallet.callMethod({
      contractId: GoForItNearContract,
      method: 'create',
      args: cobj,
      deposit: prizeOject.chain === 'NEAR' ? utils.format.parseNearAmount(prizeOject.prize) : utils.format.parseNearAmount('0.0000000000001') //still want to trigger the wallet sign method
    });

  }

  // end NEAR integration 

  const confirmGoal = async () => {
    console.log("challenge data: ", goal, deadline, prizeOject, supervisor);

    // Here you would typically send the data to your backend
    console.log('Goal confirmed! Get started!');
    try {
      let challengeId = await createChallenge();
      console.log("createChallenge returned: ", challengeId);
      setNearCreatedChallengeId(challengeId ? challengeId : '');
      setNearErrorCode(false);
    } catch (e) {
      console.log("error: ", e);
      setNearErrorCode(e.message);
    }

  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="container-fluid vh-100 d-flex  justify-content-center">
      <div className="col-md-8">
        <div className="challenge-link-container">
          {
            step === 6 ? (
              <AfterConfirm errorCode={nearErrorCode} txHash={nearTxhash} challengeId={nearCreatedChallengeId} />
            ) : (
              <>
                {step === 1 && <GoalInput setGoalProp={(g) => { setGoal(g); setStep(2); }} defaultGoal={goal} wallet={wallet} signedAccountId={signedAccountId} />}
                {step === 2 && <DateInput setDeadlineProp={(d) => { setDeadline(d); setStep(3); }} defaultDeadline={deadline} />}
                {step === 3 && <PrizeInput setPrizeProp={(p) => { setPrizeObject(p); setStep(4); }} defaultPrize={prizeOject} />}
                {step === 4 && <SupervisorInput setSupervisorProp={(s) => { setSupervisor(s); setStep(5); }} defaultAddress={supervisor} />}
                {step === 5 && (
                  <ConfirmScreen
                    goalProp={goal}
                    deadlineProp={deadline}
                    prizeProp={prizeOject}
                    supervisorProp={supervisor}
                    confirmProp={confirmGoal}
                  />
                )}
              </>

            )

          }
          <div className={`navigation-buttons bg-white card ${step == 6 ? 'd-none' : ''}`} style={{ "opacity": 0.9 }}>
            <div className="container">
              <div className="d-flex justify-content-between  align-items-center py-3">
                {step > 1 ? (
                  <button
                    className="btn btn-sm text-muted"
                    onClick={prevStep}
                  >
                    <i className="bi bi-arrow-left me-1"></i>
                    Back
                  </button>
                ) : (
                  <div></div>
                )}

                {step < 5 && (
                  <button
                    className="btn btn-sm text-primary"
                    onClick={nextStep}
                    disabled={
                      (step === 1 && (!goal.goal)) ||
                      (step === 2 && !deadline) ||
                      (step === 3 && (!prizeOject.prize || !prizeOject.successAddress || !prizeOject.failureAddress)) ||
                      (step === 4 && !supervisor)
                    }
                  >
                    Next
                    <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
