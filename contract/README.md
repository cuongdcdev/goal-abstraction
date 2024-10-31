# commands

### build && deploy

cd /home/cuong/projects/redacted-hackathon/go-do-it-chainsig/contract/goforit3 && pnpm build && near contract deploy goforitnear.testnet use-file build/goforit.wasm without-init-call network-config testnet sign-with-keychain send

### tests 

expire: in nano seconds!


- create:
1729870854184005112

1729869221000000000
1729872040363091079

NEAR
```
    near contract call-function as-transaction goforitnear.testnet create json-args '{"title":"Test Challenge 5","description":"5 This is a test challenge for the GoForIt contract","expire":1729869221000000000,"chain":"NEAR","prize":"1000000000000000000000000","judger":"cuongdc.testnet","success_addr":"3ds.testnet","failed_addr":"cuongdcdev.testnet"}' prepaid-gas '100.0 Tgas' attached-deposit '1 NEAR' sign-as cuongdcdev.testnet network-config testnet sign-with-keychain send
```

Base:
```
    near contract call-function as-transaction goforitnear.testnet create json-args '{"title":"EVM Challenge","description":"EVM ","expire":1729989646000000000,"chain":"BASE","prize":"0.0000232","judger":"cuongdc.testnet","success_addr":"0x0A624fd560Aeb33B9D01a42659D4f30F5a93b51a","failed_addr":"0xEf17bbAF522c72612D1F9558d4F51614B284334A"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as cuongdcdev.testnet network-config testnet sign-with-keychain send
```

- finalize:
NEAR:
```
  near contract call-function as-transaction goforitnear.testnet finalize json-args '{ "id": "idfea0ed76fa47b8b46d8a6b692f5678c257accb22ba2f601858aa7dffa5d8c036", "status": "ClosedSuccess" }' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as cuongdc.testnet network-config testnet sign-with-keychain send


```

- view by id

```
    near contract call-function as-read-only goforitnear.testnet get_challenge_by_id json-args '{"id":"idfea0ed76fa47b8b46d8a6b692f5678c257accb22ba2f601858aa7dffa5d8c036"}' network-config testnet now
```

## challenge IDs: 

### EVM 
EVM/eth failed: http://localhost:3001/id/id1e9c2141c37e8d257c22b0c49d39d29fe81b515b244e6f07420f329a7631eaab

base: http://localhost:3001/id/id24090a8046cd31ac78212f0f3cae80cb6a6daa0895c094b1a9f97671d8d9ffc5

ETH, success: http://localhost:3001/id/ided22a4d5f48c0863417cb873d4af677519b3a81b6abd03dbf9410517e0d6903c

base, passed: http://localhost:3001/id/idf81565e3aa5f9348f89a6906507af77c9d226bf3d8d92d83e016f9b135d73786?transactionHashes=2g8w1iNLYjBQRLR54eoqUK2CuKXKW4ZhCBDYVNYvSJvt


### NEAR 
NEAR: http://localhost:3001/id/idfea0ed76fa47b8b46d8a6b692f5678c257accb22ba2f601858aa7dffa5d8c036

NEAR, pending : http://localhost:3001/id/id1db52e30e5520e521712db551696a1b03241aa74616c6d832afdcca6e90b2ea9

NEAR, success: http://localhost:3001/id/idf21faa8ff993c8c1829cfa66fd0610d9f1b6b70134264a9bbe4485857cca6885

### Dogecoin


doge, pending: http://localhost:3001/id/idb4ec91d40ac64ae263e9328b73b44ebfa1f9deb34cf09ecd8792f65c1f31f48e

dogecoin: http://localhost:3001/id/id34756b0fd8639a57c62e0cf3a2bd57ffcc572699be46923c9743eca40d6bedf3 (tmr 1/11)

dogecoin: http://localhost:3001/id/id720d5d04c8cc77c8a0bca091a0bcef29499f2524c22f75eb02e440e5f0956dc6 

exmaple response doge:
```
{
    "result": {
        "status": "success",
        "txHash": "65eba11da97046d668e1e83d1b49517c39d30564cb6623e25766e7506dbdaf87",
        "explorerLink": "https://blockexplorer.one/dogecoin/mainnet/tx/65eba11da97046d668e1e83d1b49517c39d30564cb6623e25766e7506dbdaf87",
        "message": "Transaction broadcast successfully. It might take few minutes for transaction to be included in mempool"
    },
    "status": "success"
}

error response - fund already trnasfered:
{
    "result": {
        "status": "error",
        "txHash": "",
        "explorerLink": "",
        "message": "Insufficient funds: need 0.90234 DOGE but only have -Infinity DOGE"
    },
    "status": "success"
}

```

dogecoin tx: 
https://blockexplorer.one/dogecoin/mainnet/tx/6b5e8b73a1d5f0acadce929516b7dd05ec4677f3ab4135868b303e1ec0679db7

- view:

```
    near contract call-function as-read-only goforitnear.testnet get_challenge_by_id json-args '{"id":"id1db52e30e5520e521712db551696a1b03241aa74616c6d832afdcca6e90b2ea9"}' network-config testnet now

```
# Hello NEAR Contract

The smart contract exposes two methods to enable storing and retrieving a greeting in the NEAR network.

```ts
@NearBindgen({})
class HelloNear {
  greeting: string = "Hello";

  @view // This method is read-only and can be called for free
  get_greeting(): string {
    return this.greeting;
  }

  @call // This method changes the state, for which it cost gas
  set_greeting({ greeting }: { greeting: string }): void {
    // Record a log permanently to the blockchain!
    near.log(`Saving greeting ${greeting}`);
    this.greeting = greeting;
  }
}
```

<br />

# Quickstart

1. Make sure you have installed [node.js](https://nodejs.org/en/download/package-manager/) >= 16.
2. Install the [`NEAR CLI`](https://github.com/near/near-cli#setup)

<br />

## 1. Build and Test the Contract
You can automatically compile and test the contract by running:

```bash
npm run build
```

<br />

## 2. Create an Account and Deploy the Contract
You can create a new account and deploy the contract by running:

```bash
near create-account <your-account.testnet> --useFaucet
near deploy <your-account.testnet> build/release/hello_near.wasm
```

<br />


## 3. Retrieve the Greeting

`get_greeting` is a read-only method (aka `view` method).

`View` methods can be called for **free** by anyone, even people **without a NEAR account**!

```bash
# Use near-cli to get the greeting
near view <your-account.testnet> get_greeting
```

<br />

## 4. Store a New Greeting
`set_greeting` changes the contract's state, for which it is a `call` method.

`Call` methods can only be invoked using a NEAR account, since the account needs to pay GAS for the transaction.

```bash
# Use near-cli to set a new greeting
near call <your-account.testnet> set_greeting '{"greeting":"howdy"}' --accountId <your-account.testnet>
```

**Tip:** If you would like to call `set_greeting` using another account, first login into NEAR using:

```bash
# Use near-cli to login your NEAR account
near login
```

and then use the logged account to sign the transaction: `--accountId <another-account>`.

