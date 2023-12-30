/*
    This file initializes the database with your plaid institutions.
    You must first generate access tokens for each of your institutions using the plaid quickstart frontend
    Afterwards you can put the access tokens in the TOKENS array inside of your .env file
*/

import plaidLib from '../libs/plaid.js'
import prismaLib from '../libs/prisma.js'
import dotenv from 'dotenv'
dotenv.config()

console.log('Starting Plaid Initializer...')

const TOKENS = JSON.parse(process.env.TOKENS)

// Get Prisma and Plaid clients
const prisma_clt = prismaLib.getClient()
const plaid_clt = plaidLib.getClient()

run()
async function run() {
    await saveAllAccounts()
}

/* 
    saves all accounts into databse
*/
async function saveAllAccounts() {
    for (let token of TOKENS) {
        await saveAccounts(token)
    }
}

/* 
    saves an account to the database
*/
async function saveAccounts(access_token) {
    const { accounts, item } = await plaidLib.getAccounts(plaid_clt, access_token)

    if (item) {
        const institution = await plaidLib.getInstitutionById(plaid_clt, item.institution_id)
        const institution_map = {
            institution_id: institution.institution_id,
            name: institution.name,
            access_token: access_token,
        }
        await prismaLib.upsertInstitution(prisma_clt, institution_map)

        const accounts_map = accounts.map(acct => {
            return {
                account_id: acct.account_id,
                institution_id: institution.institution_id,
                name: acct.name,
                type: acct.type,
                iso_currency_code: acct.balances?.iso_currency_code,
                mask: acct.mask,
                available: acct.balances?.available,
                current: acct.balances?.current,
                limit: acct.balances?.limit
            }
        })

        for (let account of accounts_map) {
            await prismaLib.upsertAccount(prisma_clt, account)
        }
    }
}


