let globalConfig = null;
let currentDeployTaskId = null;
let logPollInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await autoLoadCredentials();
    
    // Search functionality
    const searchInput = document.getElementById('param-search');
    searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value.toLowerCase());
    });
    
    // Keyboard shortcut (Ctrl+K)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });
});

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        globalConfig = await response.json();
        renderSidebar();
        renderPages();
        // Open first tab
        if(globalConfig.layout.length > 0) {
            openTab(0);
        }
    } catch (err) {
        console.error('Failed to load config:', err);
    }
}

function renderSidebar() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.innerHTML = '';
    
    globalConfig.layout.forEach((tab, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.id = `nav-btn-${index}`;
        btn.innerHTML = `<span class="material-icons-round">${tab.icon || 'settings'}</span> ${tab.name}`;
        btn.onclick = () => openTab(index);
        navMenu.appendChild(btn);
    });
}

function renderPages() {
    const container = document.getElementById('page-container');
    container.innerHTML = '';
    
    globalConfig.layout.forEach((tab, index) => {
        const page = document.createElement('div');
        page.className = 'page';
        page.id = `page-${index}`;
        
        // Page Header
        page.innerHTML = `
            <div class="page-header">
                <span class="material-icons-round page-icon">${tab.icon || 'settings'}</span>
                <div class="page-title-group">
                    <h1 class="page-title">${tab.name}</h1>
                    ${tab.description ? `<p class="page-desc">${tab.description}</p>` : ''}
                </div>
            </div>
            <div class="page-sections" id="sections-${index}"></div>
        `;
        
        container.appendChild(page);
        
        const sectionsContainer = document.getElementById(`sections-${index}`);
        
        // Render Sections
        (tab.sections || []).forEach((sec, sIdx) => {
            const secDiv = document.createElement('div');
            secDiv.className = 'section';
            
            const fieldHTML = sec.fields.map(f => buildFieldHTML(f)).join('');
            
            secDiv.innerHTML = `
                <div class="section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span class="material-icons-round section-icon">${sec.icon || 'folder'}</span>
                    <div class="section-title">${sec.title} <span class="section-count">${sec.fields.length}</span></div>
                    <span class="material-icons-round section-toggle">expand_more</span>
                </div>
                <div class="section-body">
                    ${fieldHTML}
                </div>
            `;
            sectionsContainer.appendChild(secDiv);
        });
    });
}

function buildFieldHTML(fieldName) {
    let meta = {};
    let label = fieldName;
    
    if (fieldName.startsWith('__')) {
        meta = globalConfig.custom_fields[fieldName] || {};
        label = meta.label || fieldName.replace('__', '');
    } else {
        meta = globalConfig.root_params[fieldName] || {};
    }
    
    const desc = meta.Description || '';
    const defVal = meta.Default || '';
    const allowed = meta.AllowedValues || [];
    const isPassword = (meta.NoEcho || '').toLowerCase() === 'true';
    
    let severity = 'normal';
    if (desc.includes('[CRITICAL]')) severity = 'critical';
    if (desc.includes('[IMPORTANT]')) severity = 'important';
    
    const cleanDesc = desc.replace(/\[(CRITICAL|IMPORTANT|OPTIONAL)\]\s*/g, '');
    
    let labelClasses = `field-label ${severity}`;
    let iconHTML = '';
    if (severity === 'critical') iconHTML = `<span class="material-icons-round field-icon critical">emergency</span>`;
    if (severity === 'important') iconHTML = `<span class="material-icons-round field-icon important">priority_high</span>`;
    
    let inputHTML = '';
    if (allowed.length > 0) {
        let options = allowed.map(opt => `<option value="${opt}" ${opt === defVal ? 'selected' : ''}>${opt}</option>`).join('');
        // Add default if it's not in allowed
        if (defVal && !allowed.includes(defVal)) {
            options = `<option value="${defVal}" selected>${defVal}</option>` + options;
        }
        inputHTML = `<select class="input-control" data-field="${fieldName}">${options}</select>`;
    } else {
        const type = isPassword ? 'password' : 'text';
        inputHTML = `<input type="${type}" class="input-control" data-field="${fieldName}" value="${defVal}" placeholder="Enter ${label}...">`;
    }
    
    return `
        <div class="field-row search-item">
            <div class="field-label-col">
                <div class="field-label-wrapper">
                    <span class="${labelClasses}">${label}</span>
                    ${iconHTML}
                </div>
                <div class="field-desc">${cleanDesc}</div>
            </div>
            <div class="field-input-col">
                ${inputHTML}
            </div>
        </div>
    `;
}

function openTab(index) {
    // Hide deploy page
    document.getElementById('deploy-container').style.display = 'none';
    document.getElementById('page-container').style.display = 'block';

    // Update active nav
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-btn-${index}`).classList.add('active');
    
    // Update active page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${index}`).classList.add('active');
}

function openPreflight() { openDeployPage(); }
function openDeploy() { openDeployPage(); }

function openDeployPage() {
    document.getElementById('page-container').style.display = 'none';
    document.getElementById('deploy-container').style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function handleSearch(query) {
    // Basic search filtering
    const items = document.querySelectorAll('.search-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function collectData() {
    const data = {};
    document.querySelectorAll('.input-control').forEach(input => {
        data[input.dataset.field] = input.value;
    });
    return data;
}

async function startAction(actionType) {
    const btnMap = {
        'deploy': document.querySelector('.btn-primary'),
        'preflight': document.querySelector('.btn-secondary'),
        'delete': document.querySelector('.btn-danger')
    };
    
    // Disable buttons
    Object.values(btnMap).forEach(b => { if(b) b.disabled = true; b.style.opacity = '0.5'; });
    
    document.getElementById('log-output').innerText = `> Starting ${actionType} process...\n\n`;
    
    try {
        const response = await fetch('/api/deploy', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: actionType,
                fields: collectData()
            })
        });
        
        const resData = await response.json();
        if (resData.task_id) {
            pollLogs(resData.task_id, btnMap);
        } else {
            document.getElementById('log-output').innerText += `> Error: Failed to start task.\n`;
            Object.values(btnMap).forEach(b => { if(b) b.disabled = false; b.style.opacity = '1'; });
        }
    } catch(err) {
        console.error(err);
        document.getElementById('log-output').innerText += `> Network error starting task.\n`;
    }
}

function pollLogs(taskId, btnMap) {
    if (logPollInterval) clearInterval(logPollInterval);
    
    logPollInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/logs/${taskId}`);
            const data = await res.json();
            
            const logWindow = document.getElementById('log-output');
            
            if (data.logs && data.logs.trim() !== "") {
                logWindow.innerText = data.logs;
            }
            
            logWindow.scrollTop = logWindow.scrollHeight; // Auto-scroll
            
            if (!data.is_running) {
                clearInterval(logPollInterval);
                logWindow.innerText += `\n> Process finished with exit code ${data.exit_code}.`;
                Object.values(btnMap).forEach(b => { if(b) b.disabled = false; b.style.opacity = '1'; });
                
                if (data.exit_code === 0) {
                    showToast('Task completed successfully.', 'success');
                } else {
                    showToast(`Task failed with code ${data.exit_code}.`, 'error');
                }
            }
        } catch(err) {
            console.error('Polling error', err);
        }
    }, 1000);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('snackbar-container');
    const toast = document.createElement('div');
    toast.className = `snackbar ${type}`;
    let icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
    let color = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
    toast.innerHTML = `<span class="material-icons-round" style="color: ${color}">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

async function autoLoadCredentials() {
    try {
        const res = await fetch('/api/aws/credentials');
        const data = await res.json();
        if (data.status === 'success') {
            const profileInput = document.querySelector('[data-field="__aws_profile"]');
            const regionSelect = document.querySelector('[data-field="__aws_region"]');
            if (profileInput && data.profile) profileInput.value = data.profile;
            if (regionSelect && data.region) {
                // Ensure option exists, if not add it dynamically
                const exists = Array.from(regionSelect.options).some(opt => opt.value === data.region);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = data.region;
                    opt.text = data.region;
                    regionSelect.appendChild(opt);
                }
                regionSelect.value = data.region;
            }
            showToast(`AWS Credentials auto-detected (${data.region})`, 'success');
        } else if (data.message && data.message !== "No AWS credentials found in environment") {
            showToast(data.message, 'error');
        }
    } catch(err) {
        // Silent block - maybe no credentials
    }
}
