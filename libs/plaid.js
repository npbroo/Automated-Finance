/*
    This file contains a library for creating and sending requests for all the major Plaid API endpoints
*/
const plaidLib = { getClient, getInstitutionById, getInstitutions, syncTransactions, getAccounts };
export default plaidLib

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import dotenv from 'dotenv'
dotenv.config()

// Plaid api key and secret
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET_PROD = process.env.PLAID_SECRET_PROD;

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

const client = new PlaidApi(configuration);

function getClient() {
    return client
}

//import { Transaction, TransactionsSyncRequest } from 'plaid'

// gets a financial institution by its id
async function getInstitutionById(client, institution_id) {
    const request = {
        institution_id,
        country_codes: ['US'],
    };
    try {
        const response = await client.institutionsGetById(request);
        const institution = response.data.institution;
        return institution
    } catch (error) {
        // Handle error
    }
}

// gets a list of all the supported financial institutions
async function getInstitutions(client) {
    // Pull institutions
    const request = {
        count: 10,
        offset: 0,
        country_codes: ['US'],
    };
    try {
        const response = await client.institutionsGet(request);
        const institutions = response.data.institutions;
        return institutions
    } catch (error) {
        // handle error
        console.error(error)
    }
}

async function getAccounts(client, access_token) {
    const request = { access_token }
    try {
        const response = await client.accountsGet(request);
        return response.data
    } catch (error) {
        // handle error
        console.log(error)
        return null
    }
}

async function syncTransactions(client, access_token, last_cursor = null) {
    // Provide a cursor from your database if you've previously
    // received one for the Item. Leave null if this is your
    // first sync call for this Item. The first request will
    // return a cursor.
    //let cursor = database.getLatestCursorOrNull(itemId);
    let cursor = last_cursor

    // New transaction updates since "cursor"
    let added = [];
    let modified = [];
    // Removed transaction ids
    let removed = [];
    let hasMore = true;

    // Iterate through each page of new transaction updates for item
    while (hasMore) {
        const request = {
            access_token,
            cursor: cursor,
            count: 500,
            options: {
                include_original_description: true,
                days_requested: 365, // one year
            }
        };
        const response = await client.transactionsSync(request);
        const data = response.data;

        // Add this page of results
        added = added.concat(data.added);
        modified = modified.concat(data.modified);
        removed = removed.concat(data.removed);

        hasMore = data.has_more;

        // Update cursor to the next cursor
        cursor = data.next_cursor;
    }

    // Persist cursor and updated data
    return { added, modified, removed, cursor }
}