import {Client} from "@notionhq/client";
import {NotionToMarkdown} from "notion-to-md";
import {config as configDotenv} from 'dotenv'
import {resolve} from 'path'
import https from 'https'
import { createWriteStream, readFile, existsSync, mkdirSync } from "fs";
import { MdBlock } from "notion-to-md/build/types";


declare const process: {
  env: {
    NODE_ENV: string
    NOTION_TOKEN: string
    NOTION_DB: string
  }
}


switch(process.env.NODE_ENV) {
  case "CI":
    console.log("Environment is 'CI'")
    break
  default:
    console.log("Environment is 'development'")
    configDotenv({
      path: resolve(__dirname, "../.env")
    })
    break
}

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});
const n2m = new NotionToMarkdown({ notionClient: notion });


(async () => {

  const processImg = (block : MdBlock) => {
    if (block.type === 'image') {
      if(block.children) {
        block.children.forEach((child) => {
          processImg(child)
        })
      }  

      count++;
      const match : any = block.parent.match(/!\[(.*?)\]\((.*?)\)/);
      const uuid = match[2].match(/([a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}?)/i)[1]
      https.get(match[2], (res) => {
          const file = createWriteStream(`tmp/${uuid}.png`);
          res.pipe(file);
          file.on('finish', () => {
              file.close();
              console.log(`${uuid} downloaded!`);
          });
      }).on("error", (err) => {
          console.log("Error: ", err.message);
      });
      block.parent = block.parent.replace(match[2], `${uuid}.png`)
    }
    return block;
  }


  const mdblocks = await n2m.pageToMarkdown("1bf0688031c14c65a035e4fd6dc5f4fa");
  let count = 0;
  mdblocks.forEach((block) => {
    block = processImg(block)
  })

  console.log(mdblocks)
})()