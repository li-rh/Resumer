// ==UserScript==
// @name         个人信息助手
// @namespace    http://tampermonkey.net/
// @version      2.2.0
// @description  侧边栏形式的个人信息管理助手，支持分类、搜索、拖拽排序等功能
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 样式定义
    const styles = `
        #personal-info-assistant {
            position: fixed;
            top: 0;
            right: 0;
            width: 300px;
            height: 100vh;
            background: #f5f5f5;
            border-left: 1px solid #ddd;
            box-shadow: -4px 0 20px rgba(0,0,0,0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border-radius: 16px 0 0 16px; /* 左侧大圆角，右侧贴边不留 */
            overflow: hidden;
        }
        #personal-info-assistant.left {
            right: auto;
            left: 0;
            border-left: none;
            border-right: 1px solid #ddd;
            border-radius: 0 16px 16px 0;
            box-shadow: 4px 0 20px rgba(0,0,0,0.08);
        }
        #personal-info-assistant.collapsed {
            width: 48px;
            height: auto;
            top: var(--collapsed-top, 45%);
            transform: translateY(-50%);
            border-radius: 16px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.12);
            cursor: pointer;
            /* 优化拖拽动画性能 */
            will-change: top;
            transition: top 0.1s ease-out;
        }
        
        /* 拖拽过程中的流畅动画 */
        #personal-info-assistant.collapsed.dragging {
            transition: none; /* 拖拽时禁用过渡动画 */
            box-shadow: 0 8px 32px rgba(0,0,0,0.16); /* 拖拽时增强阴影 */
            transform: translateY(-50%) scale(1.02); /* 轻微放大效果 */
            background: linear-gradient(135deg, #4CAF50, #45a049); /* 拖拽时改变背景色 */
        }
        
        /* 拖拽准备状态（长按计时器期间） */
        #personal-info-assistant.collapsed.drag-ready {
            background: linear-gradient(135deg, #FF9800, #F57C00); /* 橙色表示准备拖拽 */
            box-shadow: 0 6px 24px rgba(255, 152, 0, 0.3);
        }
        #personal-info-assistant.collapsed #assistant-content,
        #personal-info-assistant.collapsed #assistant-footer {
            display: none;
        }
        /* 固定状态 - 保持固定定位不随页面滚动 */
        #personal-info-assistant.fixed {
            position: fixed;
            z-index: 10000;
        }
        #assistant-header {
            padding: 15px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 16px 0 0 0; /* 顶部圆角与主容器一致 */
        }
        
        /* 面板最小化时的通用样式 */
        #personal-info-assistant.collapsed #assistant-header {
            justify-content: center;
            position: relative;
        }
        
        #personal-info-assistant.collapsed #assistant-title {
            text-align: center;
            position: relative;
            z-index: 2;
        }
        
        /* 右侧最小化时的按钮位置 - 紧贴左侧边缘 */
        #personal-info-assistant.collapsed:not(.left) #assistant-controls {
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            display: flex;
            justify-content: center;
            z-index: 1;
        }
        
        /* 左侧最小化时的按钮位置 - 紧贴右侧边缘 */
        #personal-info-assistant.collapsed.left #assistant-controls {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            display: flex;
            justify-content: center;
            z-index: 1;
        }
        #personal-info-assistant.collapsed #fix-btn,
        #personal-info-assistant.collapsed #close-btn {
            display: none;
        }
        #assistant-title {
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
        }
        #assistant-controls {
            display: flex;
            gap: 8px;
        }
        .control-btn {
            width: 24px;
            height: 24px;
            border: none;
            background: rgba(255,255,255,0.2);
            color: white;
            cursor: pointer;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.3s ease;
            user-select: none;
        }
        .control-btn:hover {
            background: rgba(255,255,255,0.4);
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(255,255,255,0.3);
        }
        .control-btn:active {
            transform: translateY(0);
            box-shadow: 0 1px 3px rgba(255,255,255,0.3);
        }
        #assistant-content {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        #category-container {
            width: 80px;
            background: #e8e8e8;
            overflow-y: auto;
            padding: 10px 0;
            border-right: 1px solid #ddd;
        }
        .category-btn {
            width: 100%;
            padding: 12px 8px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
            word-break: break-all;
            position: relative;
            transition: all 0.3s ease;
            border-radius: 8px;
            color: #4a4a4a;
            margin-bottom: 4px;
            user-select: none;
        }
        .category-btn.active {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        .category-btn:hover:not(.active) {
            background: #f0f0f0;
            transform: translateX(2px);
            color: #333;
        }
        
        /* 分类拖拽相关样式 */
        .category-btn.dragging {
            opacity: 0.5;
            border: 2px dashed #666;
        }
        .category-btn .delete-category {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 8px;
            display: none;
            align-items: center;
            justify-content: center;
        }
        .category-btn:hover .delete-category {
            display: flex;
        }
        #add-category {
            width: 100%;
            padding: 5px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 20px;
            color: #666;
            user-select: none;
        }
        #items-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .info-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 12px 15px 10px;
            margin-bottom: 12px;
            cursor: pointer;
            position: relative;
            user-select: none;
            transition: all 0.3s ease;
            transform: translateY(0);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .info-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }
        .info-item:hover {
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
            transform: translateY(-3px);
            border-color: #d0d0d0;
        }
        .info-item:hover::before {
            transform: scaleX(1);
        }
        .info-item.dragging {
            opacity: 0.5;
            border: 2px dashed #666;
        }
        .item-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 15px;
            width: 100%;
            display: block;
            text-align: center;
            user-select: none;
        }
        .item-date {
            font-size: 11px;
            color: #666;
            margin-top: 2px;
            text-align: center;
            display: block;
        }
        .item-category {
            font-size: 11px;
            color: #666;
            background: rgba(240, 240, 240, 0.8);
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: auto;
            margin-bottom: 1px;
            display: inline-block;
            margin-top: -5px;
            user-select: none;
        }
        .info-item-header {
            display: flex;
            justify-content: flex-end;
            align-items: flex-start;
            margin-bottom: -3px;
            width: 100%;
        }
        #assistant-footer {
            padding: 15px;
            background: #e8e8e8;
            border-top: 1px solid #ddd;
        }
        #search-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            transition: all 0.3s ease;
            background: white;
            outline: none;
        }
        #search-input:focus {
            border-color: #4CAF50;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
        }
        #add-item-btn {
            width: 100%;
            padding: 12px 16px;
            margin-top: 12px;
            border: none;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border-radius: 12px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
        }
        #add-item-btn:hover {
            background: linear-gradient(135deg, #45a049, #3d8b40);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
        }
        #add-item-btn:active {
            transform: translateY(0);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        #context-menu {
            position: fixed;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            padding: 8px 0;
            display: none;
            z-index: 10000;
            min-width: 120px;
        }
        .context-menu-item {
            padding: 10px 18px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s ease;
            user-select: none;
        }
        .context-menu-item:hover {
            background: #f0f0f0;
        }
        #edit-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            padding: 25px;
            width: 90%;
            max-width: 450px;
            display: none;
            z-index: 10000;
            border: 1px solid #e0e0e0;
        }
        .modal-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            color: #333;
            user-select: none;
        }
        .form-group {
            margin-bottom: 18px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 14px;
            color: #444;
            user-select: none;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.3s ease;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #4CAF50;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
        }
        .form-group textarea {
            height: 100px;
            resize: vertical;
        }
        .modal-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 25px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            user-select: none;
        }
        .btn-primary {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #45a049, #3d8b40);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }
        .btn-primary:active {
            transform: translateY(0);
        }
        .btn-secondary {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
        }
        .btn-secondary:hover {
            background: #e0e0e0;
            transform: translateY(-1px);
        }
        .btn-secondary:active {
            transform: translateY(0);
        }
        #overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: none;
            z-index: 9998;
        }
        /* 详情弹窗样式 - 基于编辑弹窗样式但不包含操作按钮 */
        #detail-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            padding: 25px;
            width: 90%;
            max-width: 450px;
            display: none;
            z-index: 10000;
            border: 1px solid #e0e0e0;
        }
        
        #detail-modal .modal-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            color: #333;
        }
        
        #detail-modal .info-field {
            margin-bottom: 18px;
        }
        
        #detail-modal .field-label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 14px;
            color: #444;
        }
        
        #detail-modal .field-value {
            padding: 10px 12px;
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        
        #detail-modal .field-value.content {
            min-height: 100px;
            line-height: 1.5;
        }
    `;

    // 添加样式
    GM_addStyle(styles);

    // 初始化数据
    let appData = {
        categories: ['工作', '学习', '生活'],
        items: [
            {
                id: generateId(),
                title: '示例信息',
                content: '这是一条示例信息，您可以编辑或删除它。',
                category: '工作',
                order: 1
            }
        ],
        isFixed: true,
        sidebarPosition: 'right', // 默认在右侧
        collapsedPosition: null // 最小化状态下的位置信息
    };

    // 从存储加载数据
    function loadData() {
        const savedData = GM_getValue('personalInfoAssistantData');
        if (savedData) {
            try {
                appData = JSON.parse(savedData);
            } catch (e) {
                console.error('Failed to parse saved data:', e);
            }
        }
    }

    // 保存数据到存储
    function saveData() {
        GM_setValue('personalInfoAssistantData', JSON.stringify(appData));
    }

    // 生成唯一ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 创建DOM结构
    function createDOM() {
        // 创建侧边栏容器
        const assistant = document.createElement('div');
        assistant.id = 'personal-info-assistant';
        assistant.className = 'collapsed';

        // 创建头部
        const header = document.createElement('div');
        header.id = 'assistant-header';

        // 根据保存的位置设置初始按钮文本和标题
        const isLeftSide = appData.sidebarPosition === 'left';
        const toggleBtnText = isLeftSide ? '▶' : '◀';
        const toggleBtnTitle = isLeftSide ? '移到右侧' : '移到左侧';

        header.innerHTML = `
            <div id="assistant-title">信息助手</div>
            <div id="assistant-controls">
                <button class="control-btn" id="toggle-btn" title="${toggleBtnTitle}">${toggleBtnText}</button>
                <button class="control-btn" id="fix-btn" title="固定">🔒</button>
                <button class="control-btn" id="close-btn" title="点击关闭侧边栏">×</button>
            </div>
        `;

        // 创建内容区域
        const content = document.createElement('div');
        content.id = 'assistant-content';

        // 创建分类容器
        const categoryContainer = document.createElement('div');
        categoryContainer.id = 'category-container';

        // 创建项目容器
        const itemsContainer = document.createElement('div');
        itemsContainer.id = 'items-container';

        // 创建底部
        const footer = document.createElement('div');
        footer.id = 'assistant-footer';
        footer.innerHTML = `
            <input type="text" id="search-input" placeholder="搜索...">
            <button id="add-item-btn">+ 添加信息</button>
        `;

        // 组装侧边栏
        content.appendChild(categoryContainer);
        content.appendChild(itemsContainer);
        assistant.appendChild(header);
        assistant.appendChild(content);
        assistant.appendChild(footer);

        // 创建右键菜单
        const contextMenu = document.createElement('div');
        contextMenu.id = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" id="edit-item">编辑</div>
            <div class="context-menu-item" id="delete-item">删除</div>
        `;

        // 创建分类右键菜单
        const categoryContextMenu = document.createElement('div');
        categoryContextMenu.id = 'category-context-menu';
        categoryContextMenu.innerHTML = `
            <div class="context-menu-item" id="rename-category">重命名</div>
            <div class="context-menu-item" id="delete-category-menu">删除</div>
        `;
        // 复制条目右键菜单的样式
        categoryContextMenu.style.cssText = 'position: fixed; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 8px 0; display: none; z-index: 10000; min-width: 120px;';


        // 创建编辑弹窗
        const editModal = document.createElement('div');
        editModal.id = 'edit-modal';
        editModal.innerHTML = `
            <div class="modal-title">编辑信息</div>
            <div class="form-group">
                <label for="edit-title">标题</label>
                <input type="text" id="edit-title" required>
            </div>
            <div class="form-group">
                <label for="edit-start-date">开始日期</label>
                <input type="date" id="edit-start-date">
            </div>
            <div class="form-group">
                <label for="edit-end-date">结束日期</label>
                <input type="date" id="edit-end-date">
            </div>
            <div class="form-group">
                <label for="edit-content">内容</label>
                <textarea id="edit-content" required></textarea>
            </div>
            <div class="form-group">
                <label for="edit-category">分类</label>
                <select id="edit-category"></select>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancel-edit">取消</button>
                <button class="btn btn-primary" id="save-edit">保存</button>
            </div>
        `;

        // 创建分类弹窗
        const categoryModal = document.createElement('div');
        categoryModal.id = 'category-modal';
        categoryModal.innerHTML = `
            <div class="modal-title">添加分类</div>
            <div class="form-group">
                <label for="category-name">分类名称</label>
                <input type="text" id="category-name" placeholder="请输入分类名称" required>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancel-category">取消</button>
                <button class="btn btn-primary" id="save-category">确定</button>
            </div>
        `;
        // 复制编辑弹窗的样式
        categoryModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 25px; width: 90%; max-width: 450px; display: none; z-index: 10000; border: 1px solid #e0e0e0;';

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'overlay';

        // 添加到页面
        document.body.appendChild(assistant);
        document.body.appendChild(contextMenu);
        document.body.appendChild(categoryContextMenu);
        document.body.appendChild(editModal);
        document.body.appendChild(categoryModal);
        document.body.appendChild(overlay);

        return {
            assistant,
            header,
            content,
            categoryContainer,
            itemsContainer,
            footer,
            contextMenu,
            editModal,
            categoryModal,
            overlay
        };
    }

    // 渲染分类
    function renderCategories(container, activeCategory = '全部') {
        container.innerHTML = '';
        // 添加全部标签
        const allBtn = document.createElement('button');
        allBtn.className = `category-btn ${activeCategory === '全部' ? 'active' : ''}`;
        allBtn.textContent = '全部';
        allBtn.dataset.category = '全部';
        // "全部"分类不可拖拽
        allBtn.draggable = false;
        container.appendChild(allBtn);
        // 添加分类标签
        appData.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = `category-btn ${activeCategory === category ? 'active' : ''}`;
            btn.textContent = category;
            btn.dataset.category = category;
            // 设置分类按钮可拖拽
            btn.draggable = true;
            // 为分类按钮绑定右键菜单事件
            btn.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                showCategoryContextMenu(e, category);
            });
            container.appendChild(btn);
        });
        // 添加分类按钮
        const addBtn = document.createElement('button');
        addBtn.id = 'add-category';
        addBtn.textContent = '+';
        addBtn.draggable = false;
        container.appendChild(addBtn);
    }

    // 渲染信息项
    function renderItems(container, filterCategory = '全部', searchTerm = '') {
        container.innerHTML = '';

        // 过滤并排序项目
        let filteredItems = appData.items.filter(item => {
            const categoryMatch = filterCategory === '全部' || item.category === filterCategory;
            const searchMatch = !searchTerm ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.content.toLowerCase().includes(searchTerm.toLowerCase());
            return categoryMatch && searchMatch;
        });

        // 按order排序
        filteredItems.sort((a, b) => a.order - b.order);

        // 渲染项目
        filteredItems.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'info-item';
            itemEl.dataset.id = item.id;
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div class="info-item-header">
                    <div class="item-category">${item.category}</div>
                </div>
                <div class="item-title">${item.title}</div>
                ${(item.startDate || item.endDate) ? `
                    <div class="item-date">
                        ${item.startDate && item.endDate ? `${item.startDate} - ${item.endDate}` : (item.startDate || item.endDate)}
                    </div>
                ` : ''}
            `;

            container.appendChild(itemEl);
        });
    }

    // 显示右键菜单
    function showContextMenu(event, itemId) {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.display = 'block';

        // 存储当前操作的项目ID
        contextMenu.dataset.itemId = itemId;
    }

    // 隐藏右键菜单
    function hideContextMenu() {
        document.getElementById('context-menu').style.display = 'none';
    }

    // 显示分类右键菜单
    function showCategoryContextMenu(event, categoryName) {
        const categoryContextMenu = document.getElementById('category-context-menu');
        categoryContextMenu.style.left = `${event.clientX}px`;
        categoryContextMenu.style.top = `${event.clientY}px`;
        categoryContextMenu.style.display = 'block';
        // 存储当前操作的分类名称
        categoryContextMenu.dataset.categoryName = categoryName;
    }

    // 隐藏分类右键菜单
    function hideCategoryContextMenu() {
        document.getElementById('category-context-menu').style.display = 'none';
    }

    // 显示编辑弹窗
    function showEditModal(itemId = null) {
        const modal = document.getElementById('edit-modal');
        const overlay = document.getElementById('overlay');
        const categorySelect = document.getElementById('edit-category');

        // 清空并填充分类选择
        categorySelect.innerHTML = '';
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // 重置表单
        document.getElementById('edit-title').value = '';
        document.getElementById('edit-start-date').value = '';
        document.getElementById('edit-end-date').value = '';
        document.getElementById('edit-content').value = '';

        // 如果是编辑模式，填充现有数据
        if (itemId) {
            const item = appData.items.find(i => i.id === itemId);
            if (item) {
                document.getElementById('edit-title').value = item.title;
                document.getElementById('edit-start-date').value = item.startDate || '';
                document.getElementById('edit-end-date').value = item.endDate || '';
                document.getElementById('edit-content').value = item.content;
                document.getElementById('edit-category').value = item.category;
                modal.dataset.itemId = itemId;
                document.querySelector('.modal-title').textContent = '编辑信息';
            }
        } else {
            // 添加模式
            modal.dataset.itemId = '';
            document.querySelector('.modal-title').textContent = '添加信息';

            // 获取当前活动的分类，并设置为默认分类（跳过'全部'分类）
            const activeCategoryBtn = document.getElementById('category-container').querySelector('.category-btn.active');
            const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : '';
            if (activeCategory && activeCategory !== '全部' && appData.categories.includes(activeCategory)) {
                document.getElementById('edit-category').value = activeCategory;
            }
        }

        // 显示弹窗
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // 自动聚焦到标题输入框
        document.getElementById('edit-title').focus();
    }

    // 隐藏编辑弹窗
    function hideEditModal() {
        document.getElementById('edit-modal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    }

    // 保存编辑/添加的信息
    function saveItem() {
        const modal = document.getElementById('edit-modal');
        const itemId = modal.dataset.itemId;
        const title = document.getElementById('edit-title').value.trim();
        const startDate = document.getElementById('edit-start-date').value;
        const endDate = document.getElementById('edit-end-date').value;
        const content = document.getElementById('edit-content').value.trim();
        const category = document.getElementById('edit-category').value;

        if (!title || !content) {
            alert('请填写标题和内容');
            return;
        }

        if (itemId) {
            // 编辑现有项目
            const index = appData.items.findIndex(i => i.id === itemId);
            if (index !== -1) {
                appData.items[index] = {
                    ...appData.items[index],
                    title,
                    startDate,
                    endDate,
                    content,
                    category
                };
            }
        } else {
            // 添加新项目
            const maxOrder = appData.items.length > 0 ? Math.max(...appData.items.map(i => i.order)) : 0;
            appData.items.push({
                id: generateId(),
                title,
                startDate,
                endDate,
                content,
                category,
                order: maxOrder + 1
            });
        }

        // 保存并更新界面
        saveData();
        updateUI();
        hideEditModal();
    }

    // 删除信息项
    function deleteItem(itemId) {
        // 创建或获取删除确认弹窗
        let deleteModal = document.getElementById('delete-item-modal');
        if (!deleteModal) {
            deleteModal = document.createElement('div');
            deleteModal.id = 'delete-item-modal';
            deleteModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 25px; width: 90%; max-width: 450px; display: none; z-index: 10000; border: 1px solid #e0e0e0;';
            deleteModal.innerHTML = `
                <div class="modal-title">删除信息</div>
                <div style="margin: 20px 0; font-size: 14px; color: #333;">
                    确定要删除这条信息吗？此操作无法撤销。
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-delete-item">取消</button>
                    <button class="btn btn-primary" id="confirm-delete-item">确定</button>
                </div>
            `;
            document.body.appendChild(deleteModal);
        }

        // 显示弹窗和遮罩
        const overlay = document.getElementById('overlay');
        deleteModal.style.display = 'block';
        overlay.style.display = 'block';

        // 为“确定”按钮添加一次性事件监听器
        const confirmBtn = document.getElementById('confirm-delete-item');
        const cancelBtn = document.getElementById('cancel-delete-item');

        // 使用 { once: true } 确保监听器只执行一次，避免重复绑定
        confirmBtn.addEventListener('click', function handler() {
            // 执行删除操作
            appData.items = appData.items.filter(item => item.id !== itemId);
            saveData();
            updateUI();
            // 隐藏弹窗
            deleteModal.style.display = 'none';
            overlay.style.display = 'none';
        }, { once: true });

        // 为“取消”按钮添加一次性事件监听器
        cancelBtn.addEventListener('click', function handler() {
            deleteModal.style.display = 'none';
            overlay.style.display = 'none';
        }, { once: true });

        // 点击遮罩层关闭
        overlay.addEventListener('click', function handler(e) {
            if (e.target === overlay) {
                deleteModal.style.display = 'none';
                overlay.style.display = 'none';
            }
        }, { once: true });
    }

    // 显示分类弹窗
    function showCategoryModal() {
        const modal = document.getElementById('category-modal');
        const overlay = document.getElementById('overlay');
        const categoryInput = document.getElementById('category-name');

        // 重置输入框
        categoryInput.value = '';

        // 显示弹窗
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // 自动聚焦到输入框
        categoryInput.focus();
    }

    // 隐藏分类弹窗
    function hideCategoryModal() {
        document.getElementById('category-modal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    }

    // 保存新分类
    function saveCategory() {
        const categoryName = document.getElementById('category-name').value.trim();
        if (categoryName) {
            if (!appData.categories.includes(categoryName)) {
                appData.categories.push(categoryName);
                saveData();
                updateUI();
                hideCategoryModal();
            } else {
                alert('分类已存在！');
            }
        }
    }

    // 添加分类
    function addCategory() {
        showCategoryModal();
    }

    // 删除分类
    function deleteCategory(categoryName) {
        // 创建或获取删除确认弹窗
        let deleteModal = document.getElementById('delete-category-modal');
        if (!deleteModal) {
            deleteModal = document.createElement('div');
            deleteModal.id = 'delete-category-modal';
            deleteModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 25px; width: 90%; max-width: 450px; display: none; z-index: 10000; border: 1px solid #e0e0e0;';
            deleteModal.innerHTML = `
                <div class="modal-title">删除分类</div>
                <div style="margin: 20px 0; font-size: 14px; color: #333;">
                    确定要删除分类“<strong>${categoryName}</strong>”吗？
                </div>
                <div style="margin-bottom: 20px; display: flex; gap: 12px; flex-direction: column;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="delete-option" value="move" checked style="margin-right: 8px;">
                        <span>将该分类下的所有信息移动到“<strong>全部</strong>”</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="delete-option" value="delete" style="margin-right: 8px;">
                        <span>直接删除该分类下的所有信息</span>
                    </label>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-delete-category">取消</button>
                    <button class="btn btn-primary" id="confirm-delete-category">确定</button>
                </div>
            `;
            document.body.appendChild(deleteModal);
        } else {
            // 如果弹窗已存在，更新其内容
            deleteModal.querySelector('.modal-title').textContent = '删除分类';
            const messageDiv = deleteModal.querySelector('div[style*="margin: 20px"]');
            if (messageDiv) {
                messageDiv.innerHTML = `
                    确定要删除分类“<strong>${categoryName}</strong>”吗？
                `;
            }
        }

        // 显示弹窗和遮罩
        const overlay = document.getElementById('overlay');
        deleteModal.style.display = 'block';
        overlay.style.display = 'block';

        // 为“确定”按钮添加一次性事件监听器
        const confirmBtn = document.getElementById('confirm-delete-category');
        const cancelBtn = document.getElementById('cancel-delete-category');

        // 使用 { once: true } 确保监听器只执行一次，避免重复绑定
        confirmBtn.addEventListener('click', function handler() {
            const selectedOption = deleteModal.querySelector('input[name="delete-option"]:checked').value;

            if (selectedOption === 'move') {
                // 将该分类下的信息移到“全部”
                appData.items = appData.items.map(item => {
                    if (item.category === categoryName) {
                        return { ...item, category: '全部' };
                    }
                    return item;
                });
            } else if (selectedOption === 'delete') {
                // 直接删除该分类下的所有信息
                appData.items = appData.items.filter(item => item.category !== categoryName);
            }

            // 删除分类本身
            appData.categories = appData.categories.filter(cat => cat !== categoryName);
            saveData();
            updateUI();
            // 隐藏弹窗
            deleteModal.style.display = 'none';
            overlay.style.display = 'none';
        }, { once: true });

        // 为“取消”按钮添加一次性事件监听器
        cancelBtn.addEventListener('click', function handler() {
            deleteModal.style.display = 'none';
            overlay.style.display = 'none';
        }, { once: true });

        // 点击遮罩层关闭
        overlay.addEventListener('click', function handler(e) {
            if (e.target === overlay) {
                deleteModal.style.display = 'none';
                overlay.style.display = 'none';
            }
        }, { once: true });
    }
    // 编辑/重命名分类
    function editCategory(oldCategoryName) {
        // 创建或获取重命名弹窗
        let renameModal = document.getElementById('rename-category-modal');
        if (!renameModal) {
            renameModal = document.createElement('div');
            renameModal.id = 'rename-category-modal';
            renameModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 25px; width: 90%; max-width: 450px; display: none; z-index: 10000; border: 1px solid #e0e0e0;';
            renameModal.innerHTML = `
                <div class="modal-title">重命名分类</div>
                <div style="margin: 20px 0; font-size: 14px; color: #333;">
                    请为分类“<strong>${oldCategoryName}</strong>”输入新名称：
                </div>
                <div class="form-group">
                    <label for="new-category-name">新分类名称</label>
                    <input type="text" id="new-category-name" value="${oldCategoryName}" required>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-rename-category">取消</button>
                    <button class="btn btn-primary" id="confirm-rename-category">确定</button>
                </div>
            `;
            document.body.appendChild(renameModal);
        } else {
            // 如果弹窗已存在，更新其内容
            const messageDiv = renameModal.querySelector('div[style*="margin: 20px"]');
            if (messageDiv) {
                messageDiv.innerHTML = `
                    请为分类“<strong>${oldCategoryName}</strong>”输入新名称：
                `;
            }
            document.getElementById('new-category-name').value = oldCategoryName;
        }

        // 显示弹窗和遮罩
        const overlay = document.getElementById('overlay');
        renameModal.style.display = 'block';
        overlay.style.display = 'block';

        // 为“确定”按钮添加一次性事件监听器
        const confirmBtn = document.getElementById('confirm-rename-category');
        const cancelBtn = document.getElementById('cancel-rename-category');

        confirmBtn.addEventListener('click', function handler() {
            const newCategoryName = document.getElementById('new-category-name').value.trim();

            if (!newCategoryName) {
                alert('分类名称不能为空');
                return;
            }

            if (newCategoryName === oldCategoryName) {
                // 名称未改变，直接关闭
                renameModal.style.display = 'none';
                overlay.style.display = 'none';
                return;
            }

            if (appData.categories.includes(newCategoryName)) {
                alert('该分类名称已存在');
                return;
            }

            // 更新分类数组
            const index = appData.categories.indexOf(oldCategoryName);
            if (index !== -1) {
                appData.categories[index] = newCategoryName;
            }

            // 同步更新所有相关条目的分类
            appData.items = appData.items.map(item => {
                if (item.category === oldCategoryName) {
                    return { ...item, category: newCategoryName };
                }
                return item;
            });

            saveData();
            updateUI();
            // 隐藏弹窗
            renameModal.style.display = 'none';
            overlay.style.display = 'none';
        }, { once: true });

        // 为“取消”按钮添加一次性事件监听器
        cancelBtn.addEventListener('click', function handler() {
            renameModal.style.display = 'none';
            overlay.style.display = 'none';
        }, { once: true });

        // 点击遮罩层关闭
        overlay.addEventListener('click', function handler(e) {
            if (e.target === overlay) {
                renameModal.style.display = 'none';
                overlay.style.display = 'none';
            }
        }, { once: true });

        // 自动聚焦到输入框
        document.getElementById('new-category-name').focus();
    }
    // 更新项目拖拽排序
    function updateItemOrder(draggedId, targetId) {
        const draggedItem = appData.items.find(item => item.id === draggedId);
        const targetItem = appData.items.find(item => item.id === targetId);

        if (draggedItem && targetItem) {
            // 先将所有项目按当前order值排序
            appData.items.sort((a, b) => a.order - b.order);

            // 找到拖拽项目和目标项目在排序后的数组中的索引
            const draggedIdx = appData.items.findIndex(item => item.id === draggedId);
            const targetIdx = appData.items.findIndex(item => item.id === targetId);

            // 如果找到了两个项目
            if (draggedIdx !== -1 && targetIdx !== -1) {
                // 移除拖拽项目
                const removedItem = appData.items.splice(draggedIdx, 1)[0];

                // 在目标位置插入拖拽项目
                appData.items.splice(targetIdx, 0, removedItem);

                // 重新分配order值，保持连续的顺序
                appData.items.forEach((item, index) => {
                    item.order = index + 1; // 从1开始编号
                });

                saveData();
                updateUI();
            }
        }
    }

    // 更新分类拖拽排序
    function updateCategoryOrder(draggedCategory, targetCategory) {
        // 跳过"全部"分类的排序
        if (draggedCategory === '全部' || targetCategory === '全部') {
            return;
        }

        // 找到拖拽分类和目标分类在数组中的索引
        const draggedIdx = appData.categories.indexOf(draggedCategory);
        const targetIdx = appData.categories.indexOf(targetCategory);

        // 如果找到了两个分类
        if (draggedIdx !== -1 && targetIdx !== -1) {
            // 移除拖拽分类
            const removedCategory = appData.categories.splice(draggedIdx, 1)[0];

            // 在目标位置插入拖拽分类
            appData.categories.splice(targetIdx, 0, removedCategory);

            // 保存数据并更新UI
            saveData();

            // 获取当前活动的分类
            const activeCategoryBtn = document.getElementById('category-container').querySelector('.category-btn.active');
            const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : '全部';

            renderCategories(document.getElementById('category-container'), activeCategory);
        }
    }

    // 更新UI
    function updateUI() {
        const categoryContainer = document.getElementById('category-container');
        const itemsContainer = document.getElementById('items-container');
        const searchInput = document.getElementById('search-input');

        // 获取当前活动的分类
        const activeCategoryBtn = categoryContainer.querySelector('.category-btn.active');
        const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : '全部';

        // 渲染分类和项目
        renderCategories(categoryContainer, activeCategory);
        renderItems(itemsContainer, activeCategory, searchInput.value);
    }

    // 初始化应用
    function initApp() {
        // 加载数据
        loadData();

        // 创建DOM
        const domElements = createDOM();
        const { assistant } = domElements;

        // 根据保存的位置设置侧边栏初始位置
        if (appData.sidebarPosition === 'left') {
            assistant.classList.add('left');
        } else {
            assistant.classList.remove('left');
        }

        // 更新UI
        updateUI();

        // 添加事件监听

        // 分类弹窗事件
        document.getElementById('save-category').addEventListener('click', saveCategory);
        document.getElementById('cancel-category').addEventListener('click', hideCategoryModal);

        // 点击遮罩层关闭弹窗
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                hideEditModal();
                hideCategoryModal();
            }
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                hideEditModal();
                hideCategoryModal();
            }
        });

        // 侧边栏控制
        const toggleBtn = document.getElementById('toggle-btn');
        const assistantElement = document.getElementById('personal-info-assistant');
        const titleElement = document.getElementById('assistant-title');

        // 全局变量，用于跟踪侧边栏是否展开
        let isExpanded = !assistantElement.classList.contains('collapsed');

        // 按钮点击事件 - 现在用于切换左右位置
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            toggleSidebarPosition();
        });

        // 标题点击事件 - 根据侧边栏状态切换功能
        titleElement.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            if (assistantElement.classList.contains('collapsed')) {
                expandSidebar(); // 如果已收起，则展开
            } else {
                collapseSidebar(); // 如果已展开，则收起
            }
        });

        // 整个侧边栏容器的点击事件 - 当处于收起状态时，点击任何位置都能展开
        assistantElement.addEventListener('click', (e) => {
            // 只有当侧边栏处于收起状态且点击的不是按钮和标题时才处理
            if (assistantElement.classList.contains('collapsed') &&
                !e.target.closest('.control-btn') &&
                e.target.id !== 'assistant-title' &&
                !hasDragged) {
                expandSidebar();
            }
        });

        // 添加文档点击事件，实现点击侧边栏外部自动最小化功能
        document.addEventListener('click', (e) => {
            const assistant = document.getElementById('personal-info-assistant');
            // 检查点击是否在侧边栏外部，侧边栏是否展开，以及侧边栏是否处于非固定状态
            // 同时排除编辑弹窗、分类弹窗、删除分类弹窗、右键菜单和遮罩层
            if (!assistant.contains(e.target) &&
                isExpanded &&
                !appData.isFixed &&
                !e.target.closest('#edit-modal') &&
                !e.target.closest('#category-modal') &&
                !e.target.closest('#delete-category-modal') && // 新增：排除删除分类弹窗
                !e.target.closest('#context-menu') &&
                !e.target.closest('#overlay')) {
                collapseSidebar();
            }
        });

        // 切换侧边栏左右位置
        function toggleSidebarPosition() {
            const currentAssistant = document.getElementById('personal-info-assistant');

            // 切换左右位置类
            if (currentAssistant.classList.contains('left')) {
                currentAssistant.classList.remove('left');
                toggleBtn.textContent = '◀'; // 右箭头表示可以移到左边
                toggleBtn.title = '移到左侧'; // 更新title属性与图标状态匹配
                appData.sidebarPosition = 'right'; // 更新位置状态
            } else {
                currentAssistant.classList.add('left');
                toggleBtn.textContent = '▶'; // 左箭头表示可以移到右边
                toggleBtn.title = '移到右侧'; // 更新title属性与图标状态匹配
                appData.sidebarPosition = 'left'; // 更新位置状态
            }

            saveData(); // 保存位置状态
        }

        // 展开侧边栏
        function expandSidebar() {
            const currentAssistant = document.getElementById('personal-info-assistant');

            currentAssistant.classList.remove('collapsed');
            currentAssistant.classList.add('open');
            isExpanded = true;
        }

        // 收起侧边栏
        function collapseSidebar() {
            const currentAssistant = document.getElementById('personal-info-assistant');

            currentAssistant.classList.remove('open');
            currentAssistant.classList.add('collapsed');
            isExpanded = false;
        }

        // 最小化状态下的高度拖拽功能
        let isDragging = false;
        let dragStartY = 0;
        let dragStartTop = 0;
        let longPressTimer = null;
        let hasDragged = false;

        // 为侧边栏添加拖拽事件监听
        assistantElement.addEventListener('mousedown', (e) => {
            // 只在最小化状态下触发拖拽功能
            if (assistantElement.classList.contains('collapsed')) {
                // 阻止默认行为，防止文本选择
                e.preventDefault();
                
                // 添加拖拽准备状态样式
                assistantElement.classList.add('drag-ready');
                
                // 设置长按计时器（300ms，更短的响应时间）
                longPressTimer = setTimeout(() => {
                    startDrag(e);
                }, 300);
                
                // 标记为未拖拽状态
                hasDragged = false;
            }
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                handleDrag(e);
            }
        });

        // 鼠标释放事件
        document.addEventListener('mouseup', (e) => {
            // 移除拖拽准备状态样式
            assistantElement.classList.remove('drag-ready');
            
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            if (isDragging) {
                endDrag(e);
            }
        });

        // 开始拖拽
        function startDrag(e) {
            isDragging = true;
            hasDragged = true;
            dragStartY = e.clientY;
            // 获取当前侧边栏的位置
            const computedStyle = window.getComputedStyle(assistantElement);
            dragStartTop = parseFloat(computedStyle.top) || 0;
            
            // 移除拖拽准备状态样式，添加拖拽中样式
            assistantElement.classList.remove('drag-ready');
            assistantElement.classList.add('dragging');
            
            // 阻止文本选择和默认行为
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ns-resize';
        }

        // 处理拖拽 - 优化性能
        let lastAnimationFrame = null;
        let lastDragY = 0;
        let velocity = 0;
        let lastTime = 0;
        
        function handleDrag(e) {
            if (!isDragging) return;
            
            // 使用requestAnimationFrame优化性能
            if (lastAnimationFrame) {
                cancelAnimationFrame(lastAnimationFrame);
            }
            
            lastAnimationFrame = requestAnimationFrame(() => {
                const currentTime = Date.now();
                const deltaY = e.clientY - dragStartY;
                const newTop = dragStartTop + deltaY;
                
                // 计算速度（用于惯性效果）
                if (lastTime > 0) {
                    const deltaTime = currentTime - lastTime;
                    if (deltaTime > 0) {
                        velocity = (deltaY - lastDragY) / deltaTime;
                    }
                }
                lastDragY = deltaY;
                lastTime = currentTime;
                
                // 限制拖拽范围在可视区域内，添加弹性效果
                const viewportHeight = window.innerHeight;
                const sidebarHeight = assistantElement.offsetHeight;
                const minTop = 0;
                const maxTop = viewportHeight - sidebarHeight;
                
                let clampedTop = Math.max(minTop, Math.min(maxTop, newTop));
                
                // 添加边界弹性效果
                if (newTop < minTop) {
                    const overshoot = minTop - newTop;
                    clampedTop = minTop - Math.min(overshoot * 0.3, 20);
                } else if (newTop > maxTop) {
                    const overshoot = newTop - maxTop;
                    clampedTop = maxTop + Math.min(overshoot * 0.3, 20);
                }
                
                // 应用新的位置 - 使用CSS变量来存储拖拽位置，这样不会影响展开状态的样式
                assistantElement.style.setProperty('--collapsed-top', clampedTop + 'px');
            });
        }

        // 结束拖拽
        function endDrag(e) {
            isDragging = false;
            
            // 清除动画帧
            if (lastAnimationFrame) {
                cancelAnimationFrame(lastAnimationFrame);
                lastAnimationFrame = null;
            }
            
            // 移除拖拽样式，添加平滑过渡
            setTimeout(() => {
                assistantElement.classList.remove('dragging');
            }, 10);
            
            // 恢复文本选择和光标
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            // 只有在最小化状态下才保存位置到本地存储
            if (assistantElement.classList.contains('collapsed')) {
                const currentTop = parseFloat(assistantElement.style.getPropertyValue('--collapsed-top')) || 0;
                
                appData.collapsedPosition = {
                    top: currentTop
                };
                saveData();
            }
            
            // 重置速度计算
            lastDragY = 0;
            velocity = 0;
            lastTime = 0;
        }

        // 恢复保存的位置
        function restoreCollapsedPosition() {
            if (appData.collapsedPosition && assistantElement.classList.contains('collapsed')) {
                const { top } = appData.collapsedPosition;
                
                // 验证位置是否在可视区域内
                const viewportHeight = window.innerHeight;
                const sidebarHeight = assistantElement.offsetHeight;
                const minTop = 0;
                const maxTop = viewportHeight - sidebarHeight;
                
                const validTop = Math.max(minTop, Math.min(maxTop, parseInt(top) || viewportHeight / 2 - sidebarHeight / 2));
                
                // 使用CSS变量恢复位置，不修改展开状态的样式
                assistantElement.style.setProperty('--collapsed-top', validTop + 'px');
            }
        }

        // 窗口大小变化时重新计算位置
        window.addEventListener('resize', () => {
            if (assistantElement.classList.contains('collapsed')) {
                restoreCollapsedPosition();
            }
        });

        // 初始化时恢复位置
        restoreCollapsedPosition();

        document.getElementById('fix-btn').addEventListener('click', () => {
            assistant.classList.toggle('fixed');
            const isFixed = assistant.classList.contains('fixed');
            document.getElementById('fix-btn').textContent = isFixed ? '🔒' : '🔓';
            document.getElementById('fix-btn').title = isFixed ? '固定' : '取消固定';
            appData.isFixed = isFixed;
            saveData();
        });
        
        // 关闭按钮点击事件
        document.getElementById('close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            collapseSidebar();
        });

        // 分类切换
        document.getElementById('category-container').addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，防止点击分类区域被误判为外部点击
            if (e.target.classList.contains('category-btn')) {
                const category = e.target.dataset.category;
                renderCategories(document.getElementById('category-container'), category);
                renderItems(document.getElementById('items-container'), category, document.getElementById('search-input').value);
            } else if (e.target.id === 'add-category') {
                addCategory();
            }
        });

        // 分类拖拽排序功能
        let draggedCategoryBtn = null;
        let currentOverCategoryBtn = null;

        const categoryContainer = document.getElementById('category-container');

        // 分类拖拽开始事件
        categoryContainer.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.category-btn');
            if (item && item.dataset.category !== '全部') {
                e.stopPropagation();
                draggedCategoryBtn = item;

                // 立即添加拖拽样式
                item.classList.add('dragging');

                // 设置拖拽效果类型为移动
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        // 分类拖拽结束事件
        categoryContainer.addEventListener('dragend', (e) => {
            const item = e.target.closest('.category-btn');
            if (item) {
                item.classList.remove('dragging');
            }

            // 清除所有可能残留的样式
            if (currentOverCategoryBtn) {
                currentOverCategoryBtn.style.borderTop = 'none';
                currentOverCategoryBtn = null;
            }

            draggedCategoryBtn = null;
        });

        // 分类拖拽悬停事件
        categoryContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            // 设置拖拽操作效果
            e.dataTransfer.dropEffect = 'move';
        });

        // 分类拖拽进入事件
        categoryContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            // 确保不处理子元素的事件
            const item = e.target.closest('.category-btn');
            if (item && item !== draggedCategoryBtn && item !== currentOverCategoryBtn && item.dataset.category !== '全部') {
                // 清除之前元素的样式
                if (currentOverCategoryBtn) {
                    currentOverCategoryBtn.style.borderTop = 'none';
                }

                // 设置当前元素样式
                currentOverCategoryBtn = item;
                currentOverCategoryBtn.style.borderTop = '2px solid #4CAF50';
            }
        });

        // 分类拖拽离开事件
        categoryContainer.addEventListener('dragleave', (e) => {
            // 检查是否真正离开了元素
            const item = e.target.closest('.category-btn');
            if (item && currentOverCategoryBtn === item) {
                // 检查是否只是移动到了子元素上
                const relatedTarget = e.relatedTarget;
                if (!item.contains(relatedTarget)) {
                    item.style.borderTop = 'none';
                    currentOverCategoryBtn = null;
                }
            }
        });

        // 分类拖拽放置事件
        categoryContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const item = e.target.closest('.category-btn');
            if (item && item !== draggedCategoryBtn && item.dataset.category !== '全部' && draggedCategoryBtn) {
                // 清除所有样式
                if (currentOverCategoryBtn) {
                    currentOverCategoryBtn.style.borderTop = 'none';
                }

                // 更新分类顺序
                const draggedCategory = draggedCategoryBtn.dataset.category;
                const targetCategory = item.dataset.category;
                updateCategoryOrder(draggedCategory, targetCategory);
            }

            // 重置状态
            currentOverCategoryBtn = null;
        });

        // 搜索功能
        document.getElementById('search-input').addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            const activeCategoryBtn = document.getElementById('category-container').querySelector('.category-btn.active');
            const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : '全部';
            renderItems(document.getElementById('items-container'), activeCategory, searchTerm);
        });

        // 添加信息
        document.getElementById('add-item-btn').addEventListener('click', () => {
            showEditModal();
        });

        // 右键菜单
        document.getElementById('overlay').addEventListener('click', hideContextMenu);

        document.getElementById('items-container').addEventListener('contextmenu', (e) => {
            if (e.target.closest('.info-item')) {
                e.preventDefault();
                e.stopPropagation();
                const itemId = e.target.closest('.info-item').dataset.id;
                showContextMenu(e, itemId);
            }
        });

        // 右键菜单项点击
        document.getElementById('edit-item').addEventListener('click', () => {
            const itemId = document.getElementById('context-menu').dataset.itemId;
            if (itemId) {
                hideContextMenu();
                showEditModal(itemId);
            }
        });

        // 确保右键菜单在点击其他区域时关闭
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu && !contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });

        document.getElementById('delete-item').addEventListener('click', () => {
            const itemId = document.getElementById('context-menu').dataset.itemId;
            hideContextMenu();
            deleteItem(itemId);
        });

        // 分类右键菜单项点击
        document.getElementById('rename-category').addEventListener('click', () => {
            const categoryName = document.getElementById('category-context-menu').dataset.categoryName;
            hideCategoryContextMenu();
            if (categoryName && categoryName !== '全部') {
                editCategory(categoryName);
            }
        });

        document.getElementById('delete-category-menu').addEventListener('click', () => {
            const categoryName = document.getElementById('category-context-menu').dataset.categoryName;
            hideCategoryContextMenu();
            if (categoryName && categoryName !== '全部') {
                deleteCategory(categoryName);
            }
        });

        // 确保分类右键菜单在点击其他区域时关闭
        document.addEventListener('click', (e) => {
            const categoryContextMenu = document.getElementById('category-context-menu');
            if (categoryContextMenu && !categoryContextMenu.contains(e.target)) {
                hideCategoryContextMenu();
            }
        });

        // 点击遮罩层关闭分类右键菜单
        document.getElementById('overlay').addEventListener('click', hideCategoryContextMenu);

        // 编辑弹窗操作
        document.getElementById('cancel-edit').addEventListener('click', hideEditModal);
        document.getElementById('save-edit').addEventListener('click', saveItem);
        document.getElementById('overlay').addEventListener('click', hideEditModal);

///////////////////////////////////////////////// 信息项事件监听器 开始 ///////////////////////////////////////////////////
        // 初始化 items 相关变量
        const itemsContainer = document.getElementById('items-container');
        let lastClickedItemContent = null; // 存储最近点击的项目内容
        let autoFillTimeout = null; // 存储自动填充的定时器ID
        // 添加Ctrl+鼠标悬浮显示详情的功能
        let hoverTimer = null;
        let isMouseOver = false;
        // 保存当前鼠标悬浮的元素，用于在全局键盘事件中作为 startHoverTimer 参数
        let currentHoveredItem = null;
        // 创建详情弹窗
        function createDetailModal() {
            // 检查是否已存在详情弹窗
            let detailModal = document.getElementById("detail-modal");
            if (!detailModal) {
                detailModal = document.createElement("div");
                detailModal.id = "detail-modal";
                detailModal.innerHTML = `
                    <div class="modal-title" id="detail-title"></div>
                    <div class="info-field">
                        <div class="field-label">分类</div>
                        <div class="field-value" id="detail-category"></div>
                    </div>
                    <div class="info-field">
                        <div class="field-label">日期范围</div>
                        <div class="field-value" id="detail-date"></div>
                    </div>
                    <div class="info-field">
                        <div class="field-label">内容</div>
                        <div class="field-value content" id="detail-content"></div>
                    </div>
                `;
                document.body.appendChild(detailModal);
            }
            return detailModal;
        }
        // 显示详情弹窗
        function showDetailModal(item) {
            const detailModal = createDetailModal();
            
            // 填充详情内容
            document.getElementById("detail-title").textContent = item.title;
            document.getElementById("detail-category").textContent = item.category;
            
            // 设置日期范围
            const dateElement = document.getElementById("detail-date");
            if (item.startDate || item.endDate) {
                dateElement.textContent = item.startDate && item.endDate 
                    ? `${item.startDate} - ${item.endDate}` 
                    : (item.startDate || item.endDate);
                dateElement.style.display = "block";
            } else {
                dateElement.style.display = "none";
            }
            
            document.getElementById("detail-content").textContent = item.content;
            
            // 显示弹窗
            detailModal.style.display = "block";
        }
        // 隐藏详情弹窗
        function hideDetailModal() {
            const detailModal = document.getElementById("detail-modal");
            if (detailModal) {
                detailModal.style.display = "none";
            }
        }

        // 启动计时器的函数
        function startHoverTimer(item) {
            // 清除现有定时器
            if (hoverTimer) {
                clearTimeout(hoverTimer);
            }
            // 因为showDetailModal需要完整的item对象而不仅仅是dataset
            // dataset只包含HTML元素上的数据属性，而showDetailModal函数需要title、category等完整信息
            if (item && item.dataset && item.dataset.id) {
                // 设置1秒定时器
                hoverTimer = setTimeout(() => {
                    // 从appData中获取完整的item数据而不是仅使用dataset
                    const fullItem = appData.items.find(i => i.id === item.dataset.id);
                    if (fullItem) {
                        showDetailModal(fullItem);
                    }
                }, 1500);
            }
        }

        // 全局键盘事件监听 - 当鼠标悬浮在任意元素上按下Ctrl键时触发
        document.addEventListener("keydown", function(e) {
            // 检查是否有元素被悬浮且按下了Ctrl键
            if (isMouseOver && currentHoveredItem && (e.key === "Control" || e.key === "Ctrl")) {
                startHoverTimer(currentHoveredItem);
            }
        });
        // 全局键盘事件监听 - 当鼠标悬浮在任意元素上释放Ctrl键时触发
        document.addEventListener("keyup", function(e) {
            // 检查是否有元素被悬浮且释放了Ctrl键
            if (isMouseOver && currentHoveredItem && (e.key === "Control" || e.key === "Ctrl")) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
                hideDetailModal();
            }
        });

        // 处理鼠标进入事件
        function handleItemMouseEnter(e) {
                isMouseOver = true;
                // 保存当前悬浮的元素引用
                currentHoveredItem = this;
                // 如果此时按住了Ctrl键，启动计时
                if (e.ctrlKey) {
                    startHoverTimer(this);
                }
        }
        // 鼠标移动事件 - 处理悬浮期间Ctrl键状态变化
        function handleItemMouseMove(e) {
            if (hoverTimer && !e.ctrlKey) {
                // 释放了Ctrl键，清除定时器
                clearTimeout(hoverTimer);
                hoverTimer = null;
                hideDetailModal();
            } else if (!hoverTimer && e.ctrlKey) {
                // 按下了Ctrl键，启动计时
                startHoverTimer(this);
            }
        }
        // 处理鼠标离开事件
        function handleItemMouseLeave() {
            isMouseOver = false;
            // 清除当前悬浮元素引用
            currentHoveredItem = null;
            // 清除定时器
            if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
            }
            // 隐藏详情弹窗
            hideDetailModal();
        }

        // 处理信息项点击事件
        function handleItemClick(event) {
            // 检查右键菜单是否可见，如果可见则不执行填充功能
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu && contextMenu.style.display === 'block') {
                return;
            }

            const itemId = this.dataset.id;
            const item = appData.items.find(i => i.id === itemId);

            if (item) {
                // 检查是否按下Shift键和Ctrl键
                const isShiftPressed = event.shiftKey;
                const isCtrlPressed = event.ctrlKey;

                // 复制到剪贴板的功能
                const copyToClipboard = (text) => {
                    navigator.clipboard.writeText(text).then(() => {
                        console.log('[Clipboard Debug] 成功复制到剪贴板:', text);
                        // 可以在这里添加一个临时提示
                    }).catch(err => {
                        console.error('[Clipboard Debug] 复制失败:', err);
                    });
                };

                // Shift+Ctrl组合键：复制标题到剪贴板
                if (isShiftPressed && isCtrlPressed && item.title) {
                    console.log('[AutoFill Debug] 按下Shift+Ctrl键点击信息项，标题已复制到剪贴板');
                    copyToClipboard(item.title);
                }
                // Ctrl键单独按下：复制内容到剪贴板
                else if (!isShiftPressed && isCtrlPressed && item.content) {
                    console.log('[AutoFill Debug] 按下Ctrl键点击信息项，内容已复制到剪贴板');
                    copyToClipboard(item.content);
                }
                // Shift键单独按下：存储标题用于自动填充
                else if (isShiftPressed && !isCtrlPressed && item.title) {
                    console.log('[AutoFill Debug] 按下Shift键点击信息项，标题将在3秒内可自动填充');

                    // 存储点击的项目标题
                    lastClickedItemContent = item.title;
                }
                // 没有修饰键：存储内容用于自动填充
                else if (!isShiftPressed && !isCtrlPressed && item.content) {
                    console.log('[AutoFill Debug] 点击信息项，内容将在3秒内可自动填充');

                    // 存储点击的项目内容
                    lastClickedItemContent = item.content;
                }

                // 只有在非Ctrl键模式下才设置定时器（自动填充模式）
                if (!isCtrlPressed) {
                    // 清除之前的定时器
                    if (autoFillTimeout) {
                        clearTimeout(autoFillTimeout);
                    }

                    // 设置3秒后清除内容
                    autoFillTimeout = setTimeout(() => {
                        lastClickedItemContent = null;
                        console.log('[AutoFill Debug] 自动填充超时，已清除缓存的内容');
                    }, 3000);
                }
            }
        }

        // 设置信息项事件监听器
        function setupItemEvents() {
            // 移除旧的事件监听器
            const infoItems = itemsContainer.querySelectorAll('.info-item');

            // 为每个item添加事件监听器
            infoItems.forEach(item => {
                // 移除可能存在的旧监听器
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                
                newItem.addEventListener('mouseenter', (event) => handleItemMouseEnter.call(newItem, event));
                newItem.addEventListener('mousemove', (event) => handleItemMouseMove.call(newItem, event));
                newItem.addEventListener('mouseleave', (event) => handleItemMouseLeave.call(newItem, event));
                newItem.addEventListener('click', (event) => handleItemClick.call(newItem, event)); // 添加点击事件监听，传递事件对象
            });
        }
        // 首次加载时设置事件监听器
        setupItemEvents();
/////////////////////////////////////////////////// 信息项事件监听器 结束 ///////////////////////////////////////////////////

/////////////////////////////////////////////////// items-container 拖拽排序功能 开始 ///////////////////////////////////////////////////
        let draggedItem = null;
        let currentOverItem = null;

        // 为所有info-item添加draggable属性
        function ensureItemsDraggable() {
            const items = document.querySelectorAll('.info-item:not([draggable="true"])');
            items.forEach(item => {
                item.setAttribute('draggable', 'true');
                // 设置CSS光标样式以提升视觉反馈
                item.style.cursor = 'grab';
            });
        }

        // 初始化时确保可拖拽性
        ensureItemsDraggable();

        // 优化的拖拽开始事件
        document.getElementById('items-container').addEventListener('dragstart', (e) => {
            // 使用closest确保即使点击了子元素也能正确识别
            const item = e.target.closest('.info-item');
            if (item) {
                e.stopPropagation();
                draggedItem = item;

                // 立即添加拖拽样式，不使用setTimeout避免延迟
                item.classList.add('dragging');

                // 设置拖拽效果类型为移动
                e.dataTransfer.effectAllowed = 'move';

                // 创建一个轻量级的拖拽图像以提高性能
                const dragImage = document.createElement('div');
                dragImage.textContent = item.textContent.trim();
                dragImage.style.opacity = '0.8';
                dragImage.style.backgroundColor = '#fff';
                dragImage.style.border = '1px solid #ddd';
                dragImage.style.padding = '8px';
                dragImage.style.borderRadius = '4px';
                dragImage.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                document.body.appendChild(dragImage);

                // 设置自定义拖拽图像
                e.dataTransfer.setDragImage(dragImage, 20, 20);

                // 拖拽结束后移除临时元素
                setTimeout(() => document.body.removeChild(dragImage), 0);
            }
        });

        // 优化的拖拽结束事件
        document.getElementById('items-container').addEventListener('dragend', (e) => {
            const item = e.target.closest('.info-item');
            if (item) {
                item.classList.remove('dragging');
                item.style.cursor = 'grab';
            }

            // 清除所有可能残留的样式
            if (currentOverItem) {
                currentOverItem.style.borderTop = 'none';
                currentOverItem = null;
            }

            draggedItem = null;
        });

        // 优化的拖拽悬停事件
        document.getElementById('items-container').addEventListener('dragover', (e) => {
            e.preventDefault();
            // 设置拖拽操作效果
            e.dataTransfer.dropEffect = 'move';
        });

        // 优化的拖拽进入事件
        document.getElementById('items-container').addEventListener('dragenter', (e) => {
            e.preventDefault();
            // 确保不处理子元素的事件
            const item = e.target.closest('.info-item');
            if (item && item !== draggedItem && item !== currentOverItem) {
                // 清除之前元素的样式
                if (currentOverItem) {
                    currentOverItem.style.borderTop = 'none';
                }

                // 设置当前元素样式
                currentOverItem = item;
                currentOverItem.style.borderTop = '2px solid #4CAF50';
            }
        });

        // 优化的拖拽离开事件
        document.getElementById('items-container').addEventListener('dragleave', (e) => {
            // 检查是否真正离开了元素
            const item = e.target.closest('.info-item');
            if (item && currentOverItem === item) {
                // 检查是否只是移动到了子元素上
                const relatedTarget = e.relatedTarget;
                if (!item.contains(relatedTarget)) {
                    item.style.borderTop = 'none';
                    currentOverItem = null;
                }
            }
        });

        // 优化的放置事件
        document.getElementById('items-container').addEventListener('drop', (e) => {
            e.preventDefault();
            const item = e.target.closest('.info-item');
            if (item && item !== draggedItem) {
                // 清除所有样式
                if (currentOverItem) {
                    currentOverItem.style.borderTop = 'none';
                }

                // 立即响应，不添加额外延迟
                const draggedId = draggedItem.dataset.id;
                const targetId = item.dataset.id;
                updateItemOrder(draggedId, targetId);
            }

            // 重置状态
            currentOverItem = null;
        });
/////////////////////////////////////////////////// items-container 拖拽排序功能 结束 ///////////////////////////////////////////////////

/////////////////////////////////////////////////// 增加 renderItems 功能 开始 ///////////////////////////////////////////////////
        // 在渲染完项目后确保可拖拽性以及设置事件监听器
        const originalRenderItemsForDrag = renderItems;
        renderItems = function (container, filterCategory, searchTerm) {
            originalRenderItemsForDrag(container, filterCategory, searchTerm);
            setupItemEvents();
            ensureItemsDraggable();
        };
/////////////////////////////////////////////////// 增加 renderItems 功能 结束 ///////////////////////////////////////////////////
        // 使用更接近真实用户操作的方式填充内容
        function simulateUserInput(element, text) {
            try {
                // 聚焦到目标元素
                element.focus();

                // 选中当前内容（如果有的话）
                if (element.setSelectionRange) {
                    element.setSelectionRange(0, element.value.length);
                } else if (element.createTextRange) {
                    const range = element.createTextRange();
                    range.select();
                }

                // 尝试使用document.execCommand('insertText')方法，这更接近真实用户输入
                try {
                    // 插入新文本，这会替换选中的内容
                    if (document.execCommand('insertText', false, text)) {
                        console.log('[AutoFill Debug] 使用document.execCommand成功填充内容');
                    } else {
                        throw new Error('document.execCommand failed');
                    }
                } catch (execError) {
                    console.warn('[AutoFill Debug] document.execCommand失败，尝试备用方法:', execError);

                    // 备用方法1: 使用Clipboard API
                    if (navigator.clipboard && window.isSecureContext) {
                        console.log('[AutoFill Debug] 尝试使用Clipboard API');
                        navigator.clipboard.writeText(text).then(() => {
                            // 模拟Ctrl+V粘贴操作
                            const pasteEvent = new KeyboardEvent('keydown', {
                                bubbles: true,
                                cancelable: true,
                                key: 'v',
                                ctrlKey: true
                            });
                            element.dispatchEvent(pasteEvent);
                        }).catch(clipboardError => {
                            console.error('[AutoFill Error] Clipboard API失败:', clipboardError);
                            // 最终备用方案: 直接设置值
                            element.value = text;
                            triggerInputEvents(element);
                        });
                    } else {
                        // 最终备用方案: 直接设置值
                        element.value = text;
                        triggerInputEvents(element);
                    }
                }
            } catch (error) {
                console.error('[AutoFill Error] 填充内容失败:', error);
                // 最后的兜底方案
                try {
                    element.value = text;
                    triggerInputEvents(element);
                } catch (fallbackError) {
                    console.error('[AutoFill Error] 兜底方案也失败:', fallbackError);
                }
            }
        }

        // 触发输入事件的辅助函数
        function triggerInputEvents(element) {
            // 创建并触发input事件，使用compositionend标记为真实用户输入
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            inputEvent.isTrusted = true; // 虽然现代浏览器会忽略这个设置，但还是尝试设置
            element.dispatchEvent(inputEvent);

            // 触发compositionstart和compositionend事件，模拟IME输入完成
            const compStartEvent = new Event('compositionstart', { bubbles: true });
            element.dispatchEvent(compStartEvent);

            const compEndEvent = new Event('compositionend', { bubbles: true });
            compEndEvent.data = element.value; // 设置完成的文本
            element.dispatchEvent(compEndEvent);

            // 触发change事件
            const changeEvent = new Event('change', {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(changeEvent);
        }

        // 添加全局输入框点击监听，用于自动填充内容
        document.addEventListener('click', (e) => {
            // 检查点击的元素是否为可输入元素并且有最近点击的项目内容
            let targetElement = null;
            console.log('[AutoFill Debug] 点击事件触发');
            // 1. 检查直接点击的元素是否为可输入元素
            // 只检测直接点击的可输入元素
            if (isInputElement(e.target)) {
                targetElement = e.target;
                console.log('[AutoFill Debug] targetElemnet:', targetElement);
            }

            // 执行自动填充
            if (targetElement && lastClickedItemContent) {
                console.log('[AutoFill Debug] 检测到可输入元素被选中，执行自动填充');

                // 聚焦到目标元素
                try {
                    targetElement.focus();
                } catch (err) {
                    console.log('[AutoFill Debug] 无法聚焦到元素:', err);
                }

                // 使用模拟用户输入的方式填充内容
                simulateUserInput(targetElement, lastClickedItemContent);

                // 清除缓存的内容，避免重复填充
                lastClickedItemContent = null;
                if (autoFillTimeout) {
                    clearTimeout(autoFillTimeout);
                    autoFillTimeout = null;
                }
            }
        });

        // 判断元素是否为可输入元素的通用函数
        function isInputElement(element) {
            // 检查常见的表单输入元素
            if ((element.tagName === 'INPUT' &&
                (element.type === 'text' || element.type === 'email' ||
                    element.type === 'password' || element.type === 'search' ||
                    element.type === 'tel' || element.type === 'url' ||
                    element.type === 'number' || element.type === 'date' ||
                    element.type === 'datetime-local')) ||
                element.tagName === 'TEXTAREA' ||
                element.tagName === 'SELECT' ||
                // 检查是否为contenteditable元素
                element.hasAttribute('contenteditable')) {
                // 确保元素是可见且可编辑的
                return isElementVisible(element) &&
                    !element.disabled &&
                    !element.readOnly;
            }
            return false;
        }

        // 检查元素是否可见
        function isElementVisible(element) {
            const style = window.getComputedStyle(element);
            return (style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                element.offsetWidth > 0 &&
                element.offsetHeight > 0);
        }

        // 快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'l' && e.altKey && e.shiftKey) {
                e.preventDefault();

                isExpanded = !isExpanded;
                // 直接通过ID获取assistant元素，确保在任何状态下都能正确访问
                const currentAssistant = document.getElementById('personal-info-assistant');

                if (isExpanded) {
                    // 展开侧边栏
                    currentAssistant.classList.remove('collapsed');
                    currentAssistant.classList.add('open');
                } else {
                    // 收起侧边栏
                    currentAssistant.classList.remove('open');
                    currentAssistant.classList.add('collapsed');
                }
            }
        });

        // 初始化侧边栏状态
        // 默认展开 测试专用
        // isExpanded = true;
        // document.getElementById('personal-info-assistant').classList.remove('collapsed');
        // document.getElementById('personal-info-assistant').classList.add('open');

        // 确保应用固定状态
        // 强制应用appData.isFixed的值，不管之前的状态如何
        if (appData.isFixed) {
            document.getElementById('personal-info-assistant').classList.add('fixed');
        } else {
            document.getElementById('personal-info-assistant').classList.remove('fixed');
        }

        // 初始化fix-btn的状态，确保与appData.isFixed保持一致
        const fixBtn = document.getElementById('fix-btn');
        fixBtn.textContent = appData.isFixed ? '🔒' : '🔓';
        fixBtn.title = appData.isFixed ? '点击后取消固定（点击外部不隐藏）' : '点击后固定（点击外部自动隐藏）';
    }

    // 启动应用
    initApp();

})();