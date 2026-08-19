# 贴纸仓库自动目录

这个模板会在 `stickers/` 中新增、替换或删除图片后，自动更新
`sticker-catalog.json`，并刷新对应的 jsDelivr 缓存。

## 一次性安装

把模板中的文件复制到贴纸 GitHub 仓库根目录：

```text
.github/
  workflows/
    build-sticker-catalog.yml
scripts/
  build-catalog.mjs
categories.json
```

保留仓库中已有的：

```text
stickers/
sticker-catalog.json
```

提交并 Push 后，打开 GitHub 仓库的 **Actions** 页面。第一次可手动运行
`Build sticker catalog`。

如果 Action 在 `git push` 处提示 403：

1. 打开仓库 **Settings**
2. 进入 **Actions → General**
3. 找到 **Workflow permissions**
4. 选择 **Read and write permissions**
5. 保存并重新运行 Action

## 新增贴纸

推荐按分类目录存放：

```text
stickers/
  food/
    coffee__咖啡.png
    cake__蛋糕.png
  weather/
    rain__雨滴.png
```

文件名格式：

```text
英文ID__中文名称.png
```

也兼容：

```text
中文名称__英文ID.png
```

例如下面两种都会生成 ID `coffee`、名称 `咖啡`：

```text
coffee__咖啡.png
咖啡__coffee.png
```

只使用 `coffee.png` 也可以，但新文件的显示名称会是 `coffee`。

## 分类设置

目录名就是分类 ID。`categories.json` 配置分类中文名和显示顺序：

```json
{
  "food": { "name": "美食", "order": 10 },
  "weather": { "name": "天气", "order": 20 }
}
```

新增分类时：

1. 在 `stickers/` 下创建英文目录
2. 在 `categories.json` 增加对应配置
3. Push 到 GitHub

## 自动执行内容

每次 Push 影响以下内容时都会自动执行：

- `stickers/**`
- `categories.json`
- 扫描脚本
- Workflow 文件

Action 会：

1. 递归扫描所有 PNG、JPG、WEBP、GIF
2. 从目录和文件名生成 ID、名称、分类
3. 保留旧目录中已有贴纸的中文名称和分类
4. 检查重复 ID，有重复时直接报错
5. 重建 `sticker-catalog.json`
6. 自动提交目录文件
7. 刷新被修改图片和目录的 jsDelivr 缓存

## 小程序地址

目录地址：

```text
https://cdn.jsdelivr.net/gh/账号/仓库@main/sticker-catalog.json
```

图片目录：

```text
https://cdn.jsdelivr.net/gh/账号/仓库@main/stickers/
```

新增贴纸后只需 Push GitHub，不需要重新发布小程序。

## 注意事项

- GitHub 仓库必须是 Public
- 默认分支应为 `main`；不是 `main` 时请修改 Workflow 的 branches
- 小程序公众平台需配置 `https://cdn.jsdelivr.net` 为 request 和
  downloadFile 合法域名
- 不要重复使用同一个贴纸 ID
- 建议所有图片使用透明背景，并控制在 160×160 或 320×320
