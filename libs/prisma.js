/*
    This file contains a library for creating and sending requests to my Prisma Database
*/
const prismaLib = {
    getClient,
    addTransactions, addCoinbaseTransactions,
    upsertAccount, upsertInstitution, upsertTransactions,
    getAccounts, getInstitutions, getTransactions, getCoinbaseTransactions,
    setCursor,
    deleteTransactions,
    mapTxs, mapCoinbaseTxs
};
export default prismaLib

import { PrismaClient } from '@prisma/client'
const client = new PrismaClient()

function getClient() {
    return client
}

function mapCoinbaseTxs(txs) {
    // taxonomy conversions from coinbase to plaid
    const category_taxonomy_map = {
        advanced_trade_fill: ["TRANSFER_OUT", "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS"],
        interest: ["INCOME", "INCOME_INTEREST_EARNED"],
        buy: ["TRANSFER_IN", "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS"],
        fiat_deposit: ["TRANSFER_IN", "TRANSFER_IN_DEPOSIT"],
        fiat_withdrawal: ["TRANSFER_OUT", "TRANSFER_OUT_WITHDRAWAL"],
        receive: ["TRANSFER_IN", "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS"],
        request: ["TRANSFER_IN", "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS"],
        sell: ["TRANSFER_IN", "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS"],
        send: ["INCOME", "INCOME_OTHER_INCOME"],
        trade: ["TRANSFER_OUT", "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS"],
        transfer: ["TRANSFER_OUT", "TRANSFER_OUT_ACCOUNT_TRANSFER"],
        vault_withdrawal: ["TRANSFER_OUT", "TRANSFER_OUT_WITHDRAWAL"]
    }

    const txs_map = txs.map(tx => {
        return {
            transaction_id: tx.id,
            currency: tx.amount?.currency,
            amount: tx.amount?.amount,
            native_currency: tx.native_amount?.currency,
            native_amount: tx.native_amount?.amount,
            transaction_type: tx.type,
            primary_category: category_taxonomy_map[tx.type][0],
            detailed_category: category_taxonomy_map[tx.type][1],
            date: tx.created_at.split("T")[0],
            datetime: new Date(tx.created_at),
            name: `${tx.details.title} - ${tx.details.subtitle}`
        }
    })
    return txs_map
}

function mapTxs(txs) {
    const txs_map = txs.map(tx => {
        return {
            transaction_id: tx.transaction_id,
            account_id: tx.account_id,
            amount: tx.amount,
            iso_currency_code: tx.iso_currency_code,
            primary_category: tx.personal_finance_category?.primary,
            detailed_category: tx.personal_finance_category?.detailed,
            confidence_level: tx.personal_finance_category?.confidence_level,
            date: tx.date,
            datetime: tx.datetime,
            authorized_datetime: tx.authorized_datetime,
            name: tx.name,
            merchant_name: tx.merchant_name,
            payment_channel: tx.payment_channel,
            payment_processor: tx.payment_meta?.payment_processor,
            address: tx.location?.address,
            city: tx.location?.city,
            region: tx.location?.region,
            postal_code: tx.location?.postal_code,
            country: tx.location?.country,
            pending: tx.pending
        }
    })
    return txs_map
    // connect account on db push
}

async function addTransactions(prisma, transactions) {
    const _transactions = await prisma.Transaction.createMany({
        data: transactions,
        skipDuplicates: true,
    })
}

async function addCoinbaseTransactions(prisma, transactions) {
    const _transactions = await prisma.CoinbaseTransaction.createMany({
        data: transactions,
        skipDuplicates: true,
    })
}

async function upsertInstitution(prisma, institution) {
    const _institution = await prisma.Institution.upsert({
        where: { institution_id: institution.institution_id },
        update: institution,
        create: institution,
    })
    return _institution
}

async function upsertAccount(prisma, account) {
    const _account = await prisma.Account.upsert({
        where: { account_id: account.account_id },
        update: account,
        create: account,
    })
    return _account
}

async function upsertTransactions(prisma, transactions) {
    for (let tx of transactions) {
        await upsertTransaction(prisma, tx)
    }
}

async function upsertTransaction(prisma, transaction) {
    console.log(`${transaction.date} - Added TX`)
    const _transaction = await prisma.Transaction.upsert({
        where: { transaction_id: transaction.transaction_id },
        update: transaction,
        create: transaction,
    })
    return _transaction
}

async function deleteTransactions(prisma, transactions) {
    for (let tx of transactions) {
        await deleteTransaction(prisma, tx)
    }
}

async function deleteTransaction(prisma, transaction) {
    const _transaction = await prisma.Transaction.delete({
        where: { transaction_id: transaction.transaction_id },
    })
    return _transaction
}

async function getAccounts(prisma) {
    const _accounts = await prisma.Account.findMany()
    return _accounts
}

async function getInstitutions(prisma) {
    const _institutions = await prisma.Institution.findMany()
    return _institutions
}

async function getTransactions(prisma) {
    const _transactions = await prisma.Transaction.findMany()
    return _transactions
}

async function getCoinbaseTransactions(prisma) {
    const _transactions = await prisma.CoinbaseTransaction.findMany({
        where: {
            datetime: {
                gte: new Date("2023-09-01"),
            },
        }
    })
    return _transactions
}

async function setCursor(prisma, institution_id, cursor) {
    const _institution = await prisma.Institution.update({
        where: { institution_id: institution_id },
        data: { cursor: cursor },
    })
    return _institution
}