/*
    This file initializes the database with your plaid institutions.
    You must first generate access tokens for each of your institutions using the plaid quickstart frontend
    Afterwards you can put all the access tokens in the TOKENS array inside of your .env file
*/

import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'

console.log('Getting Balances...')

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET_PROD = process.env.PLAID_SECRET_PROD;

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import plaidLib from '../libs/plaid.js'
import prismaLib from '../libs/prisma.js'
import {dumpJSON} from '../libs/helpers.js'

const configuration = new Configuration({
    basePath: PlaidEnvironments.production,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
            'PLAID-SECRET': PLAID_SECRET_PROD,
            'Plaid-Version': '2020-09-14'
        },
    },
});

const prisma_clt = new PrismaClient()
const plaid_clt = new PlaidApi(configuration);

run()
async function run() {

    const _institutions = await prismaLib.getInstitutions(prisma_clt)
    for (let inst of _institutions) {
        const { accounts, item } = await plaidLib.getAccounts(plaid_clt, inst.access_token)
        console.log(accounts)
        dumpJSON({accounts, item}, _institutions.name)
    }
}