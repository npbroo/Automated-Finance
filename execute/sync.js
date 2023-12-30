/*
    Sync All Plaid Transactions to your database
    Optionally export transactions to CSV file
*/

import plaidLib from '../libs/plaid.js'
import prismaLib from '../libs/prisma.js'
import coinbaseLib from '../libs/coinbase.js'
import {dumpJSON} from '../libs/helpers.js'
import fastcsv from "fast-csv"
import fs from "fs"
import dotenv from 'dotenv'
dotenv.config()

// SETTINGS
const EXPORT_CSV = true // Export transactions to CSV?
const LOG_FILES = false // Log transactions to file?


// Include Coinbase Support?
const SYNC_COINBASE = (process.env.COINBASE_API_KEY && process.env.COINBASE_API_SECRET)

// Get Prisma and Plaid clients
const prisma_clt = prismaLib.getClient()
const plaid_clt = plaidLib.getClient()

// Create CSV export path
const FILENAME = 'TX_DATABASE.csv'
const ws = fs.createWriteStream(FILENAME)


run()
async function run() {
    // Sync Plaid
    await syncInstitutions()
    // Sync Coinbase
    if (SYNC_COINBASE) await syncCoinbase()
    // Export transactions
    if (EXPORT_CSV) await exportCSV(prisma_clt)
}

/*
    Sync a Plaid Institution
*/
async function syncInstitution(institution_id, access_token, last_cursor) {
    const { added, modified, removed, cursor } = await plaidLib.syncTransactions(plaid_clt, access_token, last_cursor)

    const _added = prismaLib.mapTxs(added)
    const _modified = prismaLib.mapTxs(modified)

    // add the new transactions to the database
    await prismaLib.addTransactions(prisma_clt, _added)
    _added.forEach(e => {
        console.log(`Added: ${e.date} - ${e.merchant_name} = $${e.amount}`)
    });
    // overwrite modified transactions
    await prismaLib.upsertTransactions(prisma_clt, _modified)
    _modified.forEach(e => {
        console.log(`Modified: ${e.date} - ${e.merchant_name} = $${e.amount}`)
    });
    // delete removed transactions
    await prismaLib.deleteTransactions(prisma_clt, removed)

    // save the new cursor to the database
    // this is where you will start the next sync from
    await prismaLib.setCursor(prisma_clt, institution_id, cursor)

    // log transactions to file
    if (LOG_FILES) {
        dumpJSON(added, 'added')
        dumpJSON(modified, 'modified')
        dumpJSON(removed, 'removed')
    }
}

/*
    Sync All Plaid Institutions
*/
async function syncInstitutions() {
    console.log('Starting Plaid Interfacer...')
    const _institutions = await prismaLib.getInstitutions(prisma_clt)

    for (let inst of _institutions) {
        console.log(`Syncing ${inst.name}`)
        await syncInstitution(inst.institution_id, inst.access_token, inst.cursor)
    }
}

/* 
    Sync Coinbase Accounts
*/ 
async function syncCoinbase() {
    console.log('Starting Coinbase Interfacer...')

    // get all the accounts in the tracked accounts list
    const accounts = await coinbaseLib.getAccounts()

    // append all transactions together for each account
    var txs = []
    for (let acct of accounts) {
        const _txs = await coinbaseLib.listAccountTransactions(acct.id)
        const filtered_txs = _txs.filter(tx => tx.status == "completed")
        txs = txs.concat(filtered_txs)
    }

    // map the transactions for coinbase
    const mapped_txs = prismaLib.mapCoinbaseTxs(txs)

    // push to database
    await prismaLib.addCoinbaseTransactions(prisma_clt, mapped_txs)
}



/*
    Export The Transactions to a CSV for personal use
*/
export async function exportCSV(prisma_clt) {
    const accounts = await prismaLib.getAccounts(prisma_clt)
    const transactions = await prismaLib.getTransactions(prisma_clt)
    const coinbase_transactions = await prismaLib.getCoinbaseTransactions(prisma_clt)

    const _transactions = transactions.map(tx => {
        // get the official account names
        tx.account_id = getAcctNameByID(accounts, tx.account_id)
        return tx
    })

    const _coinbase_transactions_mapped = mapCoinbaseToCSV(coinbase_transactions)

    const _txs_final = _transactions.concat(_coinbase_transactions_mapped)

    fastcsv.write(_txs_final, { headers: true })
        .on('finish', function () {
            console.log("Export Was Successful!")
        })
        .pipe(ws)
}

// helper function returns the account name associated with the account id
function getAcctNameByID(accounts, id) {
    for (let acct of accounts) {
        if (acct.account_id == id) {
            return acct.name
        }
    }
}

// helper function maps the Coinbase transaction format to the same format as Plaid transactions
function mapCoinbaseToCSV(transactions) {
    const _transactions = transactions.map(tx => {
        return {
            transaction_id: tx.transaction_id,
            account_id: 'Coinbase',
            amount: -tx.native_amount,
            iso_currency_code: tx.native_currency,
            primary_category: tx.primary_category,
            detailed_category: tx.detailed_category,
            confidence_level: 'HIGH',
            date: tx.date,
            datetime: tx.datetime,
            authorized_date: null,
            authorized_datetime: null,
            name: tx.name,
            merchant_name: `Coinbase ${tx.currency} Wallet`,
            payment_channel: 'online',
            payment_processor: null,
            address: null,
            city: null,
            region: null,
            postal_code: null,
            country: null,
            pending: false
        }
    })
    return _transactions
}