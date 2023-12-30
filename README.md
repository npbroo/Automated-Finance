
# Automated Finance

This project streamlines the synchronization of financial transactions from personal bank accounts and credit cards.

It uses [Plaid](https://plaid.com/) to connect and sync account transactions from your financial institutions to your database of choice.

## Getting Started

1. Sign up for a [Plaid Developer Account](https://dashboard.plaid.com/developers/keys) and apply for the Plaid Production Key.
3. Download Plaid's [Quickstart App](https://plaid.com/docs/quickstart/) and use it to generate access tokens for each financial institution you would like to link.
4. Set up a new database to store your transactions. (I recommend using [Planetscale](https://planetscale.com/) to spin a new one up for free)
4. Duplicate the .sample.env file and rename it to .env
5. Follow the instructions to fill out the .env file



## Setup

After setting up the .env file, sync your database with the Prisma schema.

```bash
  npx prisma db push
```

Next, initialize the database with your Plaid institutions.

```bash
  yarn ini
```

Now you can sync new transactions to your database whenever you want.

```bash
  yarn sync
```
## Optional Coinbase Support

Coinbase was not supported by Plaid when I created this project. I later integrated Coinbase support (USA only) for personal use and optionally included it into this project.

You can generate a Coinbase API key by following the instructions [here](https://help.coinbase.com/en/cloud/api/coinbase/key-creation).

Afterwards, simply add the developer key and secret in your .env file.