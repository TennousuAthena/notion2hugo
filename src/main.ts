import {Client} from "@notionhq/client";
import {NotionToMarkdown} from "notion-to-md";
import {config as configDotenv} from 'dotenv'
import {resolve} from 'path'
import { writeFileSync, readFile, existsSync, mkdirSync } from "fs";
import {Post} from "./type/post";

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

n2m.setCustomTransformer('equation', async (block) => {
  const {equation} = block as any;
  if (!equation?.expression) return '';
  return `
$$
  ${equation.expression.replace(/\\\\/g, '\\\\\\\\')}
$$`;
});

(async () => {
  const myPage = await notion.databases.query({
    database_id: process.env.NOTION_DB,
    "filter": {
        "property": "noHugo",
        "checkbox": {
            "equals": false
        }
    } 
  })
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
    
    const mdString = n2m.toMarkdownString(mdblocks);
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
        // const dir = "hugo/content/post/"+fileName;
        // if (!existsSync(dir)) {
        //   console.log("Creating directory: "+dir)
        //   mkdirSync(dir, { recursive: true });
        // }
        // writeFileSync("hugo/content/post/"+fileName+"/index.md", fileContent, {flag: 'w'})
        writeFileSync("hugo/content/post/"+fileName+".md", fileContent, {flag: 'w'})

      }
      catch(err){
        console.error(err)
      }
    })
  })

})();