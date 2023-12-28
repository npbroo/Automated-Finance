import dotenv from 'dotenv'
dotenv.config()
console.log('Testing...')

import coinbaseLib from '../libs/coinbase.js'
import prismaLib from '../libs/prisma.js'

const prisma_clt = prismaLib.getClient()


run()
async function run() {
    
}

import fastcsv from "fast-csv"
import fs from "fs"
function exportCSV(transactions) {
    // save to excel document
    const ws = fs.createWriteStream('COINBASE_TXS.csv')
    fastcsv.write(transactions, { headers: true })
        .on('finish', function () {
            console.log("na")
        })
        .pipe(ws)
}