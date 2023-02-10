import {Client} from "@notionhq/client";
import {NotionToMarkdown} from "notion-to-md";
import {config as configDotenv} from 'dotenv'
import {resolve} from 'path'
import { writeFileSync, readFile, createWriteStream, existsSync, mkdirSync } from "fs";
import {Post} from "./type/post";
import https from 'https'
import { MdBlock } from "notion-to-md/build/types";

declare global {
  interface String {
    render(context: any): string;
  }
}
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

String.prototype.render = function (context) {
  return this.replace(/{{(.*?)}}/g, (match, key) => context[key.trim()]);
};

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const n2m = new NotionToMarkdown({ notionClient: notion });
// 自定义解析器
n2m.setCustomTransformer('equation', async (block) => {
  const {equation} = block as any;
  if (!equation?.expression) return '';
  return `
$$
  ${equation.expression.replace(/\\\\/g, '\\\\\\\\')}
$$`;
});

(async () => {
  // 获取所有文章
  const myPage = await notion.databases.query({
    database_id: process.env.NOTION_DB,
    "filter": {
        "property": "noHugo",
        "checkbox": {
            "equals": false
        }
    } 
  })
  // 读取模板
  let fileTemplate = "";
  readFile('template/article.md', (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    fileTemplate = data.toString()
  })
  myPage.results.forEach(async (page :any) => {
    const mdblocks = await n2m.pageToMarkdown(page.id);
    
    
    await notion.pages.retrieve({ page_id: page.id }).then((pageInfo:any) => {
      console.log("Processing page: "+pageInfo.properties.Name.title[0].plain_text)
      let description = typeof pageInfo.properties.Description.rich_text[0] != "undefined" ? pageInfo.properties.Description.rich_text[0].plain_text : '';
      let date = pageInfo.properties.CreatedAt.date ? pageInfo.properties.CreatedAt.date.start : pageInfo.created_time;
      let image = '';
      if(pageInfo.cover){
        switch(pageInfo.cover.type){
          case 'external':
            image = pageInfo.cover.external.url;
            break;
          case 'file':
            image = pageInfo.cover.file.url;
            break;
        }
      }
      let articleTitle = ''
      pageInfo.properties.Name.title.forEach((title:any) => {
        if (title.plain_text.length > 0) {
          articleTitle += title.plain_text;
        }
      })

      let fileName = articleTitle.replace(/\s/g,"-").replace(/[^a-zA-Z0-9[\u4E00-\uFA29]|[\uE7C7-\uE7F3]]/g,"-").replace(/--/g,'').toLowerCase();
      fileName = fileName.lastIndexOf("-")==fileName.length-1? fileName.substring(0, fileName.length - 1) : fileName;

      let tags = pageInfo.properties.Tags.multi_select.map((tag:any) => tag.name);
      let tagString = '';
      tags.forEach((tag:any) => {
        tagString += '  - '+tag + "\n"
      })
      let categories = '';
      let categories_array = pageInfo.properties.Categories.multi_select.map((c:any) => c.name);
      categories_array.forEach((c:any) => {
        categories += '  - '+c + "\n"
      })

      //创建目录
      const dir = "hugo/content/post/"+fileName;
      mdblocks.forEach((block) => {
        if (block.type === 'image' || image) {
          if (!existsSync(dir)) {
            console.log("Creating directory: "+dir)
            mkdirSync(dir, { recursive: true });
          }
          return;
        }
      })


      // 替换图片地址
      let count = 0;
      const processImg = (block : MdBlock) => {
        if(block.children) {
          block.children.forEach((child) => {
            processImg(child)
          })
        }
        if (block.type === 'image' || block.type === 'file') {
            count++;
            const match : any = block.parent.match(/\[(.*?)\]\((.*?)\)/);
            const match_uuid = match[2].match(/([a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}?)/i);
            const ext = match[2].split("?")[0].split(".").pop()
            if(!match_uuid || !ext){
              return block;
            }
            const uuid = match_uuid[1]

            if(!existsSync(`${dir}/${uuid}.${ext}`)){
              https.get(match[2], (res) => {
                  const file = createWriteStream(`${dir}/${uuid}.${ext}`);
                  res.pipe(file);
                  file.on('finish', () => {
                      file.close();
                      console.log(`${uuid}.${ext} downloaded!`);
                  });
              }).on("error", (err) => {
                  console.log("Error: ", err.message);
              });
            }
            block.parent = block.parent.replace(match[2], `${uuid}.${ext}`)
          }
        return block;
      }

      mdblocks.forEach((block) => {
        block = processImg(block)
      })

      // 替换Image链接地址
      if(image && !existsSync(`${dir}/header.png`)){
        https.get(image, (res) => {
            const file = createWriteStream(`${dir}/header.png`);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Header downloaded!`);
            });
        }).on("error", (err) => {
            console.log("Error: ", err.message);
        });
      }
      if(image){
        image = 'header.png'
      }

      // 生成文章信息
      const mdString = n2m.toMarkdownString(mdblocks);
      let post : Post = {
        title: articleTitle,
        description: description,
        date: date,
        lastmod: pageInfo.last_edited_time,
        tags_array: tags,
        tags: tagString,
        image: image,
        content: mdString,
        slug: fileName,
        categories: categories,
      }
      let fileContent = ''
      fileContent = fileTemplate.render(post)

      try{
        console.log("Writing file: "+fileName+".md")
        if(count || image){
          console.log("Found "+count+" asset(s) in total")
          writeFileSync("hugo/content/post/"+fileName+"/index.md", fileContent, {flag: 'w'})
        }else{
          writeFileSync("hugo/content/post/"+fileName+".md", fileContent, {flag: 'w'})
        }
      }
      catch(err){
        console.error(err)
      }
    })
  })

})();