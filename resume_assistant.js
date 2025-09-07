// ==UserScript==
// @name         个人信息助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  侧边栏形式的个人信息管理助手，支持分类、搜索、拖拽排序等功能
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
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
            top: 50%;
            transform: translateY(-50%);
            border-radius: 16px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.12);
            cursor: pointer;
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
        #personal-info-assistant.collapsed #fix-btn {
            display: none;
        }
        #assistant-title {
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
        #assistant-controls {
            display: flex;
            gap: 8px;
        }
        .control-btn {
            width: 16px;
            height: 16px;
            border: none;
            background: rgba(255,255,255,0.2);
            color: white;
            cursor: pointer;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            transition: all 0.3s ease;
        }
        .control-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(255,255,255,0.2);
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
            padding: 14px 18px;
            margin-bottom: 12px;
            cursor: pointer;
            position: relative;
            user-select: none;
            transition: all 0.3s ease;
            transform: translateY(0);
            overflow: hidden;
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
            margin-bottom: 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 15px;
        }
        .item-category {
            font-size: 11px;
            color: #666;
            position: absolute;
            top: 10px;
            right: 15px;
            background: rgba(240, 240, 240, 0.8);
            padding: 2px 6px;
            border-radius: 4px;
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
        }
        .context-menu-item:hover {
            background: #f0f0f0;
        }
        #tooltip {
            position: fixed;
            display: block;
            opacity: 0;
            transform: translateY(10px) scale(0.95);
            background-color: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            max-width: 450px;
            word-wrap: break-word;
            z-index: 2147483647;
            line-height: 1.4;
            font-size: 14px;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        #tooltip.show {
            opacity: 1;
            transform: translateY(0) scale(1);
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
        sidebarPosition: 'right' // 默认在右侧
    };
    
    // 侧边栏展开状态变量
    let isExpanded = true;

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

        // 创建提示框
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';

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

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'overlay';

        // 添加到页面
        document.body.appendChild(assistant);
        document.body.appendChild(contextMenu);
        document.body.appendChild(tooltip);
        document.body.appendChild(editModal);
        document.body.appendChild(overlay);

        return {
            assistant,
            header,
            content,
            categoryContainer,
            itemsContainer,
            footer,
            contextMenu,
            tooltip,
            editModal,
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
        container.appendChild(allBtn);

        // 添加分类标签
        appData.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = `category-btn ${activeCategory === category ? 'active' : ''}`;
            btn.textContent = category;
            btn.dataset.category = category;

            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-category';
            deleteBtn.textContent = '×';
            deleteBtn.dataset.category = category;
            btn.appendChild(deleteBtn);

            container.appendChild(btn);
        });

        // 添加分类按钮
        const addBtn = document.createElement('button');
        addBtn.id = 'add-category';
        addBtn.textContent = '+';
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
                <div class="item-category">${item.category}</div>
                <div class="item-title">${item.title}</div>
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

    // 显示提示框，与条目宽度相同且对齐
        function showTooltip(content, itemElement) {
            // 获取tooltip元素，如果不存在则创建
            let tooltip = document.getElementById('tooltip');
            if (!tooltip) {
                createTooltipElement();
                tooltip = document.getElementById('tooltip');
                if (!tooltip) return;
            }
            
            // 移除show类以重置动画
            tooltip.classList.remove('show');
            
            // 设置提示框内容，最多显示50个字符
            const displayContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
            tooltip.textContent = displayContent;
            
            // 强制设置显示样式
            tooltip.style.visibility = 'hidden'; // 先设置为不可见以获取尺寸
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '9999';
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '10px 15px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '14px';
            tooltip.style.pointerEvents = 'none';
            
            // 计算位置 - 与条目宽度相同且水平对齐
            if (itemElement) {
                const itemRect = itemElement.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // 设置tooltip宽度与条目相同
                tooltip.style.width = `${itemRect.width}px`;
                tooltip.style.maxWidth = `${itemRect.width}px`;
                
                // 计算垂直位置：条目下方10px
                let top = itemRect.bottom + 10;
                
                // 视口边界检查 - 垂直方向
                if (top + tooltip.offsetHeight > viewportHeight - 10) {
                    // 如果下方空间不足，显示在条目上方
                    top = itemRect.top - tooltip.offsetHeight - 10;
                }
                top = Math.max(10, Math.min(top, viewportHeight - tooltip.offsetHeight - 10));
                
                // 设置位置 - 水平与条目左边缘对齐
                tooltip.style.left = `${itemRect.left}px`;
                tooltip.style.top = `${top}px`;
            }
            
            // 强制回流，确保动画生效
            tooltip.offsetWidth;
            
            // 显示tooltip
            tooltip.style.visibility = 'visible';
            // 使用setTimeout确保样式应用后再添加show类以触发动画
            setTimeout(() => {
                tooltip.classList.add('show');
            }, 10);
        }
        
        // 创建tooltip元素
        function createTooltipElement() {
            try {
                console.log('[Tooltip Debug] 尝试创建tooltip元素');
                const existingTooltip = document.getElementById('tooltip');
                if (!existingTooltip) {
                    const tooltip = document.createElement('div');
                    tooltip.id = 'tooltip';
                    tooltip.style.cssText = 'display:block; visibility:visible; opacity:1; z-index:9999; position:fixed; background-color:rgba(0,0,0,0.8); color:white; padding:10px 15px; border-radius:4px; max-width:450px; font-size:14px; pointer-events:none;';
                    document.body.appendChild(tooltip);
                    console.log('[Tooltip Debug] 已成功创建tooltip元素');
                }
            } catch (error) {
                console.error('[Tooltip Debug] 创建tooltip元素失败:', error);
            }
        }

    // 隐藏提示框（带日志调试）
        function hideTooltip() {
            console.log('[Tooltip Debug] hideTooltip 被调用');
            try {
                const tooltip = document.getElementById('tooltip');
                if (tooltip) {
                    // 移除show类，触发淡出动画
                    tooltip.classList.remove('show');
                    
                    // 等待动画完成后再完全隐藏
                    setTimeout(() => {
                        if (tooltip && !tooltip.classList.contains('show')) {
                            tooltip.style.visibility = 'hidden';
                            console.log('[Tooltip Debug] 已移除show类并隐藏tooltip');
                        }
                    }, 300);
                }
                
                // 同时移除临时tooltip
                const tempTooltip = document.getElementById('temp-tooltip');
                if (tempTooltip) {
                    tempTooltip.remove();
                }
            } catch (error) {
                console.error('[Tooltip Debug] hideTooltip函数执行出错:', error);
            }
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
        document.getElementById('edit-content').value = '';

        // 如果是编辑模式，填充现有数据
        if (itemId) {
            const item = appData.items.find(i => i.id === itemId);
            if (item) {
                document.getElementById('edit-title').value = item.title;
                document.getElementById('edit-content').value = item.content;
                document.getElementById('edit-category').value = item.category;
                modal.dataset.itemId = itemId;
                document.querySelector('.modal-title').textContent = '编辑信息';
            }
        } else {
            // 添加模式
            modal.dataset.itemId = '';
            document.querySelector('.modal-title').textContent = '添加信息';
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
        if (confirm('确定要删除这条信息吗？')) {
            appData.items = appData.items.filter(item => item.id !== itemId);
            saveData();
            updateUI();
        }
    }

    // 添加分类
    function addCategory() {
        const categoryName = prompt('请输入分类名称：');
        if (categoryName && categoryName.trim()) {
            const trimmedName = categoryName.trim();
            if (!appData.categories.includes(trimmedName)) {
                appData.categories.push(trimmedName);
                saveData();
                updateUI();
            } else {
                alert('分类已存在！');
            }
        }
    }

    // 删除分类
    function deleteCategory(categoryName) {
        if (confirm(`确定要删除分类"${categoryName}"吗？该分类下的所有信息将被移动到默认分类。`)) {
            // 将该分类下的信息移到第一个分类
            const firstCategory = appData.categories[0] || '全部';
            appData.items = appData.items.map(item => {
                if (item.category === categoryName) {
                    return { ...item, category: firstCategory };
                }
                return item;
            });

            // 删除分类
            appData.categories = appData.categories.filter(cat => cat !== categoryName);
            saveData();
            updateUI();
        }
    }

    // 更新拖拽排序
    function updateItemOrder(draggedId, targetId) {
        const draggedIndex = appData.items.findIndex(item => item.id === draggedId);
        const targetIndex = appData.items.findIndex(item => item.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // 调整order值
            const draggedItem = appData.items[draggedIndex];
            const targetItem = appData.items[targetIndex];

            // 简单的交换order值
            const tempOrder = draggedItem.order;
            draggedItem.order = targetItem.order;
            targetItem.order = tempOrder;

            saveData();
            updateUI();
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
                    e.target.id !== 'assistant-title') {
                    expandSidebar();
                }
            });
            
            // 添加文档点击事件，实现点击侧边栏外部自动最小化功能
            document.addEventListener('click', (e) => {
                const assistant = document.getElementById('personal-info-assistant');
                
                // 检查点击是否在侧边栏外部，侧边栏是否展开，以及侧边栏是否处于非固定状态
                if (!assistant.contains(e.target) && 
                    isExpanded && 
                    !appData.isFixed &&
                    !e.target.closest('#edit-modal') &&
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

        document.getElementById('fix-btn').addEventListener('click', () => {
            assistant.classList.toggle('fixed');
            const isFixed = assistant.classList.contains('fixed');
            document.getElementById('fix-btn').textContent = isFixed ? '🔒' : '🔓';
            document.getElementById('fix-btn').title = isFixed ? '固定' : '取消固定';
            appData.isFixed = isFixed;
            saveData();
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
            } else if (e.target.classList.contains('delete-category')) {
                const category = e.target.dataset.category;
                deleteCategory(category);
            }
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
            if (!contextMenu.contains(e.target) && !e.target.closest('.info-item')) {
                hideContextMenu();
            }
        });

        document.getElementById('delete-item').addEventListener('click', () => {
            const itemId = document.getElementById('context-menu').dataset.itemId;
            hideContextMenu();
            deleteItem(itemId);
        });

        // 编辑弹窗操作
        document.getElementById('cancel-edit').addEventListener('click', hideEditModal);
        document.getElementById('save-edit').addEventListener('click', saveItem);
        document.getElementById('overlay').addEventListener('click', hideEditModal);

        // 初始化tooltip相关变量
        let tooltip = document.getElementById('tooltip');
        const itemsContainer = document.getElementById('items-container');
        let currentMousePos = { x: 100, y: 100 }; // 设置默认位置，避免初始为null
        let tooltipTimeout = null; // 存储tooltip延迟显示的定时器ID
        let lastClickedItemContent = null; // 存储最近点击的项目内容
        let autoFillTimeout = null; // 存储自动填充的定时器ID
        
        // 如果没有tooltip元素，尝试创建
        if (!tooltip) {
            createTooltipElement();
            tooltip = document.getElementById('tooltip');
        }
        
        console.log('[Tooltip Debug] 初始化tooltip变量:', {
            tooltipExists: !!tooltip,
            itemsContainerExists: !!itemsContainer
        });
        
        // 监听整个文档的鼠标移动，更新当前鼠标位置
        document.addEventListener('mousemove', function(e) {
            currentMousePos = {
                x: e.clientX,
                y: e.clientY
            };
        });
        
        // 处理鼠标进入事件（带延迟显示）
        function handleItemMouseEnter(event) {
            const itemId = this.dataset.id;
            console.log('[Tooltip Debug] 鼠标进入info-item，ID:', itemId);
            
            const item = appData.items.find(i => i.id === itemId);
            if (item) {
                console.log('[Tooltip Debug] 找到对应的数据项:', {title: item.title, hasContent: !!item.content});
                
                if (item.content) {
                    // 清除之前可能存在的定时器
                    if (tooltipTimeout) {
                        clearTimeout(tooltipTimeout);
                    }
                    
                    // 设置3秒延迟显示tooltip
                    console.log('[Tooltip Debug] 设置3秒延迟显示tooltip');
                    tooltipTimeout = setTimeout(() => {
                        showTooltip(item.content, this); // 传递当前条目元素
                    }, 3000); // 3秒延迟
                } else {
                    console.log('[Tooltip Debug] 数据项没有内容，不显示tooltip');
                }
            } else {
                console.warn('[Tooltip Debug] 警告：未找到对应的数据项');
            }
        }
        
        // 处理鼠标离开事件（清除延迟定时器）
        function handleItemMouseLeave() {
            console.log('[Tooltip Debug] 鼠标离开info-item');
            
            // 清除延迟显示的定时器
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = null;
                console.log('[Tooltip Debug] 已清除tooltip延迟显示定时器');
            }
            
            hideTooltip();
        }
        
        // 处理信息项点击事件
        function handleItemClick() {
            const itemId = this.dataset.id;
            const item = appData.items.find(i => i.id === itemId);
            
            if (item && item.content) {
                console.log('[AutoFill Debug] 点击信息项，内容将在3秒内可自动填充');
                
                // 存储点击的项目内容
                lastClickedItemContent = item.content;
                
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
        
        // 设置tooltip事件委托（带日志调试）
        function setupTooltipEvents() {
            console.log('[Tooltip Debug] setupTooltipEvents 被调用');
            
            // 移除旧的事件监听器
            const infoItems = itemsContainer.querySelectorAll('.info-item');
            console.log('[Tooltip Debug] 找到', infoItems.length, '个info-item元素');
            
            // 为每个item添加事件监听器
            let addedListeners = 0;
            infoItems.forEach(item => {
                // 移除可能存在的旧监听器
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                
                newItem.addEventListener('mouseenter', handleItemMouseEnter);
                newItem.addEventListener('mouseleave', handleItemMouseLeave);
                newItem.addEventListener('click', handleItemClick); // 添加点击事件监听
                addedListeners++;
            });
            
            console.log('[Tooltip Debug] 已为', addedListeners, '个info-item添加事件监听器');
        }
        
        // 在渲染完项目后设置事件监听器
        const originalRenderItems = renderItems;
        renderItems = function(container, filterCategory, searchTerm) {
            originalRenderItems(container, filterCategory, searchTerm);
            setupTooltipEvents();
        };
        
        // 首次加载时设置事件监听器
        setupTooltipEvents();

        // 拖拽排序
        let draggedItem = null;
        document.getElementById('items-container').addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('info-item')) {
                draggedItem = e.target;
                setTimeout(() => {
                    e.target.classList.add('dragging');
                }, 0);
            }
        });

        document.getElementById('items-container').addEventListener('dragend', (e) => {
            if (e.target.classList.contains('info-item')) {
                e.target.classList.remove('dragging');
                draggedItem = null;
            }
        });

        document.getElementById('items-container').addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.getElementById('items-container').addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('info-item') && e.target !== draggedItem) {
                e.target.style.borderTop = '2px solid #4CAF50';
            }
        });

        document.getElementById('items-container').addEventListener('dragleave', (e) => {
            if (e.target.classList.contains('info-item')) {
                e.target.style.borderTop = 'none';
            }
        });

        document.getElementById('items-container').addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('info-item') && e.target !== draggedItem) {
                e.target.style.borderTop = 'none';

                // 更新排序
                const draggedId = draggedItem.dataset.id;
                const targetId = e.target.dataset.id;
                updateItemOrder(draggedId, targetId);
            }
        });

        // 添加全局输入框点击监听，用于自动填充内容
        document.addEventListener('click', (e) => {
            // 检查点击的元素是否为输入框并且有最近点击的项目内容
            if ((e.target.tagName === 'INPUT' && 
                 (e.target.type === 'text' || e.target.type === 'email' || e.target.type === 'password' || e.target.type === 'search')) || 
                e.target.tagName === 'TEXTAREA') {
                
                if (lastClickedItemContent) {
                    console.log('[AutoFill Debug] 检测到输入框被选中，执行自动填充');
                    
                    // 设置输入框内容
                    e.target.value = lastClickedItemContent;
                    
                    // 触发input事件，确保相关框架能检测到变化
                    const inputEvent = new Event('input', { bubbles: true });
                    e.target.dispatchEvent(inputEvent);
                    
                    // 清除缓存的内容，避免重复填充
                    lastClickedItemContent = null;
                    if (autoFillTimeout) {
                        clearTimeout(autoFillTimeout);
                        autoFillTimeout = null;
                    }
                }
            }
        });
        
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
        // assistant.classList.add('open'); // 默认展开
        // document.getElementById('toggle-btn').textContent = '◀'; // 默认右箭头表示可以移到左边
        
        // 确保应用固定状态
        // 强制应用appData.isFixed的值，不管之前的状态如何
        if (appData.isFixed) {
            assistant.classList.add('fixed');
        } else {
            assistant.classList.remove('fixed');
        }
        
        // 初始化fix-btn的状态，确保与appData.isFixed保持一致
        const fixBtn = document.getElementById('fix-btn');
        fixBtn.textContent = appData.isFixed ? '🔒' : '🔓';
        fixBtn.title = appData.isFixed ? '点击后取消固定（点击外部不隐藏）' : '点击后固定（点击外部自动隐藏）';
    }

    // 启动应用
    initApp();

})();