#!/bin/bash

# 书签管理系统部署脚本

echo "🚀 开始部署书签管理系统..."

# 检查是否安装了wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误：未找到wrangler CLI"
    echo "请先安装wrangler: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "🔐 请先登录Cloudflare账户..."
    wrangler login
fi

# 创建D1数据库（如果不存在）
echo "📊 创建D1数据库..."
DB_OUTPUT=$(wrangler d1 create bookmark-manager 2>&1)
if [[ $DB_OUTPUT == *"already exists"* ]]; then
    echo "✅ 数据库已存在"
else
    echo "✅ 数据库创建成功"
    echo "$DB_OUTPUT"
fi

# 初始化数据库结构
echo "🗄️ 初始化数据库结构..."
wrangler d1 execute bookmark-manager --file=./schema.sql

# 部署到Cloudflare Pages
echo "🌐 部署到Cloudflare Pages..."
wrangler pages deploy public --project-name=bookmark-manager

echo "✅ 部署完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 在Cloudflare Pages控制台中绑定D1数据库"
echo "2. 设置环境变量 DB = bookmark-manager"
echo "3. 访问你的域名查看书签管理系统"
echo ""
echo "🔗 管理后台地址: https://your-domain.pages.dev/admin.html"
