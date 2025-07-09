#!/usr/bin/env node

const { execSync } = require("node:child_process");
const path = require("node:path");
const { argv, fs, cd } = require("zx");
const { Command } = require("commander");
const {
  migrateCustom,
  pullCustomTheme,
} = require("./migrate_custom/migrate_custom");
const { uptoOnLineSheet } = require("./migrate_custom/migrate_custom_record");
const {
  readThemeFilesRelation,
} = require("./migrate_custom/theme_files_relation");
const { transToSnippets } = require("./migrate_custom/trans_snippets");
const { getBaseLineTheme } = require("./migrate_custom/baseline");
const { BASELINE, UPGRADING, UPGRADED, NOT_UPGRADED } = require("./constant");
const scanConvertSync = require("./migrate_custom/migrate_convert");
const {
  geneScreenshots,
  recordToFeiShuTable,
} = require("./migrate_custom/glue");
const {
  migrateCustomConfig,
  replaceCustomConfig,
} = require("./migrate_custom/migrate_custom_config");
const { checkCustom } = require("./migrate_custom/migrate_check");
const { Print, mkdir } = require("./util");
const upgrade = require("./migrate_custom/upgrade");
const { manualUpdate } = require("./migrate_custom/migrate_manual_update");

async function main() {
  const program = new Command();
  program
    .name("solution")
    .description("集定制主题升级、主题相关查询一站式CLI工具")
    .version("1.0.0");

  // ***************************************************************************
  const mcsCMD = new Command("mcs").description("标准定制升级");
  mcsCMD.action(async () => {
    await pullCustomTheme();
    await migrateCustom();
    await migrateCustomConfig();
  });

  mcsCMD.command("upgrade").description("一键升级标准定制主题").action(upgrade);

  mcsCMD
    .command("init")
    .description("初始化目录和json")
    .action(() => {
      mkdir(NOT_UPGRADED);
      fs.writeFileSync(path.join(NOT_UPGRADED, "theme.json"), "", "utf-8");
    });

  mcsCMD
    .command("pull")
    .description("获取定制代码")
    .action(() => pullCustomTheme());

  mcsCMD
    .command("config")
    .description("配置templates,settings_data替换")
    .action(replaceCustomConfig);

  mcsCMD
    .command("check")
    .description("检查标准定制代码")
    .argument("[path]", "用以检查的路径, 精确到 theme 目录")
    .action(checkCustom);

  mcsCMD
    .command("trans")
    .description("迁移标准定制代码")
    .action(() => migrateCustom());

  mcsCMD
    .command("trans-config")
    .argument("[old path]", "升级前主题文件夹, 精确到 theme 目录")
    .argument("[new path]", "升级后主题文件夹, 精确到 theme 目录")
    .description("迁移标准定制配置")
    .action(migrateCustomConfig);

  mcsCMD
    .command("record")
    .description("记录标准定制升级到飞书多维表")
    .action(uptoOnLineSheet);

  mcsCMD
    .command("manual-update")
    .argument("[path]", "升级前主题文件夹, 精确到 theme 目录")
    .argument("[new path]", "最新主题文件夹, 精确到 theme 目录")
    .description("以当前目录视为最新主题, 进行手动更新")
    .action(manualUpdate);

  // ***************************************************************************
  const mcnCMD = new Command("mcn").description("非标定制升级");
  mcnCMD.action(async () => {
    await transToSnippets();
    Print.green("✅ 非标定制转换标准定制代码");
    await readThemeFilesRelation();
    Print.green("✅ 获取主题定制卡片-snippets文件关系");
    await geneScreenshots();
    Print.green("✅ 根据卡片关系生成截图");
    await recordToFeiShuTable(UPGRADED, UPGRADING);
    Print.green("✅ 迁移记录写入飞书多维表");
  });

  mcnCMD
    .command("init")
    .description("初始化目录和json")
    .action(() => {
      mkdir(BASELINE);
      mkdir(UPGRADED);
      cd(BASELINE);
      fs.writeFileSync("theme.json", "", "utf-8");
    });

  mcnCMD
    .command("baseline")
    .description("获取 baseline主题")
    .action(async () => {
      await getBaseLineTheme();
      fs.copySync(BASELINE, UPGRADING);
    });

  mcnCMD
    .command("trans")
    .description("旧主题 + 非标定制 -> 旧主题 + 文件标准定制")
    .action(transToSnippets);

  mcnCMD
    .command("check")
    .description("TODO...")
    .action(() => console.log("TODO..."));

  mcnCMD
    .command("relation")
    .description("获取snippets和theme关系")
    .action(readThemeFilesRelation);

  mcnCMD
    .command("snap")
    .description("根据relation命令关系，导出带卡片标注的页面截图")
    .action(geneScreenshots);

  mcnCMD
    .command("record")
    .description("记录变更到多维表格")
    .action(recordToFeiShuTable);

  mcnCMD
    .command("convert")
    .description(
      "旧主题 + 非标定制 -> 旧主题 + 文件标准定制（改造jquery，使用spz/js）"
    )
    .action(() => scanConvertSync(UPGRADED, UPGRADING));

  // ***************************************************************************
  const themeCMD = new Command("theme").description("主题数据库相关");
  themeCMD
    .command("version <theme_id>")
    .description("根据theme_id查询主题版本")
    .action(async (theme_id) => {
      const jsPath = path.join(__dirname, "../archery/index.js");
      const stdout = execSync(`node ${jsPath} theme_version ${theme_id}`);
      console.log(stdout.toString());
    });

  // ***************************************************************************
  const accountCMD = new Command("account").description("account数据库相关");
  accountCMD
    .command("domain <store_id>")
    .description("根据store_id查询店铺主域名")
    .action((store_id) => {
      const jsPath = path.join(__dirname, "../archery/index.js");
      const std = execSync(`node ${jsPath} account_domain ${store_id}`);
      console.log(std.toString());
    });

  program.addCommand(mcsCMD);
  program.addCommand(mcnCMD);

  program.addCommand(themeCMD);
  program.addCommand(accountCMD);
  program.parse();
}

main();
