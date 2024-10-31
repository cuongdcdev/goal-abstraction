import { NearBindgen, near, call, view, initialize, UnorderedMap, assert } from 'near-sdk-js';

// Enum for challenge status
const Status = {
  Open: 'Open',
  ClosedSuccess: 'ClosedSuccess',
  ClosedFailed: 'ClosedFailed'
};

// Challenge class
class Challenge {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public expire: number,
    public chain: string,
    public prize: string,
    public judger: string,
    public success_addr: string,
    public failed_addr: string,
    public status: string
  ) { }
}

@NearBindgen({})
class ChallengeContract {
  challenges: UnorderedMap<Challenge>;
  service_fee: number;
  owner: string;

  constructor() {
    this.challenges = new UnorderedMap('challenges');
    this.service_fee = 5; // Default 5% service fee
    this.owner = '';
  }

  @initialize({})
  init({ owner }: { owner: string }) {
    this.owner = owner || near.currentAccountId();
  }

  @call({payableFunction: true})
  /**
   * @param title - The title of the challenge
   * @param description - The description of the challenge
   * @param expire - since the block time of NEAR is around 1 second, The expiration time of the challenge will be in seconds too 
   * @param chain - The chain of the challenge
   * @param prize - The prize of the challenge
   * @param judger - The judger of the challenge
   * @param success_addr - The success address of the challenge
   * @param failed_addr - The failed address of the challenge
   */
  create({ title, description, expire, chain, prize, judger, success_addr, failed_addr }: {
    title: string, description: string, expire: number, chain: string,
    prize: string, judger: string, success_addr: string, failed_addr: string
  }) {
    if (chain == "NEAR"){
      let attached_deposit = near.attachedDeposit();
      assert(attached_deposit > 0 && attached_deposit >= BigInt(prize), "Attached deposit must be greater than 0 and greater than prize");
    }
    assert(success_addr.trim() !== '', "Success address must not be empty");
    assert(failed_addr.trim() !== '', "Failed address must not be empty");
    assert(judger.trim() !== '', "Judger address must not be empty");
    assert(expire > near.blockTimestamp(), "Expired time must be greater than current block time, current block timestamp: " + near.blockTimestamp());

    const randomSeed = near.randomSeed();
    const id = `id${Array.from(randomSeed).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    const challenge = new Challenge(
      id, title, description, expire, chain, prize,
      judger, success_addr, failed_addr, Status.Open
    );

    this.challenges.set(id, challenge);

    // Emit event
    near.log(`EVENT_JSON:{"standard":"goforit","version":"1.0.0","event":"challenge_created","data":${JSON.stringify({
      id: challenge.id,
      expire: challenge.expire,
      chain: challenge.chain,
      prize: challenge.prize,
      judger: challenge.judger,
      success_addr: challenge.success_addr,
      failed_addr: challenge.failed_addr,
    })}}`);

    return id;
  }

  @call({})
  finalize({ id, status }: { id: string, status: string }) {
    const challenge = this.challenges.get(id) as Challenge;
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (near.predecessorAccountId() !== challenge.judger) {
      throw new Error('Only the judge can finalize the challenge. Judger address: ' + challenge.judger);
    }
    
    if (challenge.status !== Status.Open) {
      throw new Error('Challenge is closed already!');
    }

    if (status !== Status.ClosedSuccess &&  status !== Status.ClosedFailed) {
      throw new Error('Invalid status, must be ClosedSuccess or ClosedFailed');
    }

    if ( near.blockTimestamp() < challenge.expire ) {
      throw new Error('Challenge has not expired yet, the expired time is around: ' + challenge.expire + ' current block timestamp: ' + near.blockTimestamp());
    }

    challenge.status = status;

    if (challenge.chain === 'NEAR') {
      const prize = BigInt(challenge.prize);
      const serviceFee = (prize * BigInt(this.service_fee)) / BigInt(100);
      const remainingPrize = prize - serviceFee;
      const targetAddress = status === Status.ClosedSuccess ? challenge.success_addr : challenge.failed_addr;
      const promise = near.promiseBatchCreate(targetAddress);
      near.promiseBatchActionTransfer(promise, remainingPrize);
    }

    // Transfer service fee to owner
    // const prms = near.promiseBatchCreate(this.owner);
    // near.promiseBatchActionTransfer(prms, serviceFee);

    this.challenges.set(id, challenge);

    // Emit event
    near.log(`EVENT_JSON:{"standard":"goforit","version":"1.0.0","event":"challenge_updated","data":${JSON.stringify({
      id: challenge.id,
      status: challenge.status,
      success_addr: challenge.success_addr,
      failed_addr: challenge.failed_addr,
      prize: challenge.prize,
      service_fee: this.service_fee,
      judger: challenge.judger,
    })}}`);
  }

  @view({})
  get_all_challenges(): Challenge[] {
    return this.challenges.toArray().map(([_, challenge]) => challenge);
  }

  @view({})
  get_challenge_by_id({ id }: { id: string }): Challenge | null {
    return this.challenges.get(id) as Challenge | null;
  }

  @call({})
  set_service_fee({ fee }: { fee: number }) {
    if (near.predecessorAccountId() !== this.owner) {
      throw new Error('Only the owner can set the service fee');
    }
    if (fee < 0 || fee > 100) {
      throw new Error('Service fee must be between 0 and 100');
    }
    this.service_fee = fee;
  }

  // Commented out as in the original Rust code
  // @call({})
  // set_owner({ new_owner }: { new_owner: string }) {
  //   if (near.predecessorAccountId() !== this.owner) {
  //     throw new Error('Only the current owner can set a new owner');
  //   }
  //   this.owner = new_owner;
  // }
}