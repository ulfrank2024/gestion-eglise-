require('dotenv').config({ path: '../.env' }); // Assurez-vous que le chemin vers .env est correct
const nodemailer = require('nodemailer');

const user = process.env.NODEMAILER_EMAIL;
const pass = process.env.NODEMAILER_PASSWORD;

if (!user || !pass) {
  throw new Error('Nodemailer email and password are required.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user,
    pass,
  },
});

module.exports = { transporter };
