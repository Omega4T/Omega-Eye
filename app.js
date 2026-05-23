import dotenv from "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { Telegraf } from "telegraf"; // Sesuaikan dengan library bot lo (misal Telegraf)
import axios from "axios";
import { ethers } from "ethers";

const requiredEnv = ["BOT_TOKEN", "GEMINI_API", "NEWS_API"];
const missingEnv = requiredEnv.filter((envName) => !process.env[envName]);

if (missingEnv.length > 0) {
  console.error(
    `CRITICAL ERROR: Missing environment variables: ${missingEnv.join(", ")}`,
  );
  process.exit(1);
}

console.log("=== OMEGA EYE CORE SYSTEM LIVE ===");
console.log("All environment variables verified successfully.");
console.log("=====================================");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API });

bot.start((ctx) => {
  const username = ctx.from?.first_name || "Bro";

  ctx.reply(
    `Yo, Welcome ${username} to Omega Eye Bot!\n\n` +
      `This bot is engineered to monitor high-impact global macroeconomic news and instantly correlate them with real-time on-chain data movement.\n\n` +
      `"Logic-driven. AI-powered. Error-proven."`,
  );
});

bot.command("ping", (ctx) => {
  ctx.reply("Pong!, System is live, logic running smoothly");
});

bot.command("checknews", async (ctx) => {
  try {
    ctx.reply("Fetching global macroeconomic metrics");

    const url = `https://newsapi.org/v2/everything?q=(FOMC OR "Federal Reserve" OR Inflation OR CPI)&language=en&sortBy=publishedAt&pageSize=3&apiKey=${process.env.NEWS_API}`;
    const response = await axios.get(url);
    const articles = response.data.articles;
    // console.log("=== RAW API RESPONSE ===");
    // console.log(response.data);
    // console.log("========================");
    // const articles = response.data.articles;

    if (!articles || articles.length === 0) {
      return ctx.reply(
        "No relevant news found at the moment. Try again later.",
      );
    }

    let rawNewsText = "";
    articles.forEach((article, index) => {
      rawNewsText += `News ${index + 1}: ${article.title}. Source: ${article.source.name}.\n`;
    });

    const urlIntel1 = articles[0]?.url || "#";
    const urlIntel2 = articles[1]?.url || "#";

    const prompt = `
    You are 0xGesho Macro-Watch Bot, an elite Web3 & Macroeconomic Analyst.
    Analyze these 3 recent global macro news headlines and provide a brief, professional market sentiment analysis in English.
    
    Raw News Data:
    ${rawNewsText}
    
    Your output format MUST strictly look like this in HTML:
    
    <b>Global Macroeconomic Watch:</b>
    
    <b>Executive Summary:</b>
    (Provide a 2-sentence summary of the overall macro situation)
    
    <b>Market Sentiment Outlook:</b>
    <b>Sentiment:</b> [BULLISH / BEARISH / NEUTRAL]
    <b>Crypto Impact:</b> (1 short sentence on how this affects BTC/Crypto markets)
    
    <b>Key Verification Intel:</b>
    1. <a href="${urlIntel1}">Verify Intel 1</a>
    2. <a href="${urlIntel2}">Verify Intel 2</a>
    `;

    const aiResult = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const aiResponseText = aiResult.text;

    ctx.reply(aiResponseText, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    if (error.response && error.response.status === 429) {
      ctx.reply("News API rate limit exceeded. Please try again later.");
    } else {
      console.error("Error fetching news:", error);
      ctx.reply(
        "An error occurred while fetching news. Please try again later.",
      );
    }
  }
});

const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const abi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const provider = new ethers.WebSocketProvider(process.env.ALCHEMY_WSS);
const usdtContract = new ethers.Contract(USDT_ADDRESS, abi, provider);

console.log("Web3 Vision Activated: Listening for USDT Whale transfers");

usdtContract.on("Transfer", async (from, to, value, event) => {
  try {
    const formattedValue = ethers.formatUnits(value, 6);
    const numValue = Number(formattedValue);
    const txHash = event.log.transactionHash;

    console.log(`Detected USDT Transfer - From: ${from}, To: ${to}, Amount: ${numValue} USDT, TxHash: ${txHash}`);


    if (numValue >= 100000) {
      console.log(`[ON-CHAIN ALERT] ${numValue} USDT transferred`);

      const aiPrompt = 
      `You are 0xGesho On-Chain Alert Bot, an elite Web3 Data Analyst.
      A whale transfer of ${numValue} USDT just occurred on the Ethereum blockchain.
      From: ${from}
      To: ${to}. Give a short brief analysis (1-2 sentences) of what this could potentially indicate in the current market context. Keep it concise, professional, and insightful.
      STRICTLY format your response using HTML tags like  for bold text. DO NOT use Markdown formatting like *.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: aiPrompt,
      })

      const cleanText = aiResponse.text.replace(/\*\*/g, "");

      const txMessage =
        `🚨 <b>WHALE ALERT DEPLOYED</b> 🚨\n\n` +
        `💰 <b>Amount:</b> ${numValue.toLocaleString("en-US")} USDT\n` +
        `📤 <b>From:</b> <code>${from}</code>\n` +
        `📥 <b>To:</b> <code>${to}</code>\n\n` +
        `🔗 <b>Tx Hash:</b> <a href="https://etherscan.io/tx/${txHash}">Verify on Etherscan</a>\n\n` +
        `🤖 <i>Market Analysis: ${cleanText}</i>`

      await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, txMessage, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    }
  } catch (err) {
    console.error("Error processing on-chain event:", err);
  }
});

bot
  .launch()
  .then(() => console.log("Omega Eye Bot is up and running!"))
  .catch((err) => console.error("Failed to launch Omega Eye Bot:", err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
