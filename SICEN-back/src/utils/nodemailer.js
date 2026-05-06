import nodemailer from "nodemailer";
import env from "../config/env.config.js";

export const transport = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  auth: {
    user: env.googleEmail,
    pass: env.googlePass,
  },
});