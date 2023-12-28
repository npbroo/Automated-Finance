

import crypto from 'crypto'
import dotenv from 'dotenv'
import axios from 'axios'
dotenv.config()

const COINBASE_API_KEY = process.env.COINBASE_API_KEY
const COINBASE_API_SECRET = process.env.COINBASE_API_SECRET

// Coinbase tracked codes in .env file
const COINBASE_TRACKED_CODES = JSON.parse(process.env.COINBASE_TRACKED_CURRENCY_CODES)

const coinbaseLib = {getAccounts, listAccountTransactions}
export default coinbaseLib

/*
    Returns a list of all of a user's accounts, including cryptocurrency wallets, fiat currency accounts, and vaults.
*/
async function getAccounts() {
    const path = '/v2/accounts'
    const body = ''


    const {data:_accounts} = await getData(path, body)
    const accounts = _accounts.filter(acct => COINBASE_TRACKED_CODES.includes(acct.currency?.code))
    return accounts
}

/*
    Returns a list of transactions for an account by account ID.
*/
async function listAccountTransactions(account_id) {
    const path = `/v2/accounts/${account_id}/transactions`
    const body = ''

    var next_uri = path
    var all_data = []
    do {
        const {pagination, data} = await getData(next_uri, body)
        console.log('Syncing...')
        next_uri = pagination?.next_uri
        all_data = all_data.concat(data)
    } while (next_uri)
    
    return all_data
}

/*
    Generates a signature to send to coinbase under the 'CB-ACCESS-SIGN' header
*/
function genSignature(req, timestamp) {
    // create message to encode
    var message = timestamp + req.method + req.path + req.body;
    // create a hexedecimal encoded SHA256 signature of the message
    var signature = crypto.createHmac("sha256", COINBASE_API_SECRET).update(message).digest("hex");
    return signature
}

/*
    Generates the options to send to the axios request
*/
function genOptions(path, body) {

    // generate request
    const req = {
        method: 'GET',
        path,
        body
    }

    // get the unix time in seconds
    var timestamp = Math.floor(Date.now() / 1000);

    // generate signature
    const signature = genSignature(req, timestamp)

    // create the request options 
    return {
        baseURL: 'https://api.coinbase.com/',
        url: req.path,
        method: req.method,
        headers: {
            'CB-ACCESS-SIGN': signature,
            'CB-ACCESS-TIMESTAMP': timestamp.toString(),
            'CB-ACCESS-KEY': COINBASE_API_KEY,
            'CB-VERSION': '2015-07-22'
        }
    };
}

/*
    Gets data from a path given the body
*/
async function getData(path, body) {
    //create the request options object
    const req = genOptions(path, body)

    //send request
    const {data} = await axios(req)
    return data 
}