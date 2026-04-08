const midtransClient = require('midtrans-client');

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

if (!serverKey) {
  throw new Error('MIDTRANS_SERVER_KEY is required');
}

if (!clientKey) {
  throw new Error('MIDTRANS_CLIENT_KEY is required');
}

const midtransConfig = {
  isProduction,
  serverKey,
  clientKey,
};

const snap = new midtransClient.Snap(midtransConfig);
const coreApi = new midtransClient.CoreApi(midtransConfig);

module.exports = { snap, coreApi };
