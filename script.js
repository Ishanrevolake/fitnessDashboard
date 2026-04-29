// Data simulation for charts and stats
const chartData = {
    weight: [75.2, 75.0, 74.8, 74.9, 74.6, 74.4],
    sleep: [7.2, 6.8, 7.5, 6.5, 7.0, 6.96], // in hours
    hr: [70, 68, 69, 67, 66, 66],
    steps: [8500, 9200, 7800, 10500, 11000, 9650]
};

// Initialize charts (simulated with SVG or CSS for lightweight performance)
function initCharts() {
    const charts = ['weight', 'sleep', 'hr', 'steps'];

    charts.forEach(chartId => {
        const container = document.getElementById(`${chartId}Chart`);
        if (!container) return;

        const data = chartData[chartId];
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        // Create a simple SVG polyline
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 80;
            const y = 40 - ((val - min) / range) * 30 - 5;
            return `${x},${y}`;
        }).join(' ');

        container.innerHTML = `
            <svg viewBox="0 0 80 40" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="gradient-${chartId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:var(--accent-red);stop-opacity:0.2" />
                        <stop offset="100%" style="stop-color:var(--accent-red);stop-opacity:0" />
                    </linearGradient>
                </defs>
                <path d="M 0,40 ${points.split(' ').map((p, i) => i === 0 ? 'L ' + p : 'L ' + p).join(' ')} L 80,40 Z" fill="url(#gradient-${chartId})" />
                <polyline points="${points}" fill="none" stroke="var(--accent-red)" stroke-width="2" />
                <circle cx="${points.split(' ').pop().split(',')[0]}" cy="${points.split(' ').pop().split(',')[1]}" r="3" fill="var(--accent-red)" />
            </svg>
        `;
    });
}

// Interactivity for notifications and search
function initInteractivity() {
    const iconBtns = document.querySelectorAll('.circle-btn, .icon-btn');
    iconBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => btn.style.transform = 'scale(1)', 100);
        });
    });

    // Simulated real-time update
    setInterval(() => {
        const notificationDot = document.querySelector('.notification-dot');
        if (notificationDot) {
            notificationDot.style.opacity = notificationDot.style.opacity === '0' ? '1' : '0';
        }
    }, 2000);
}

// Sidebar interactivity
// Sidebar interactivity
function initSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');

    if (!sidebar) return;

    // 1. Initialize Listeners (ONLY ONCE)
    if (!sidebar.dataset.initialized) {
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isExpanded = sidebar.classList.contains('expanded');
                if (isExpanded) {
                    sidebar.classList.remove('expanded');
                    sidebar.classList.add('collapsed');
                    // Close any open submenus when collapsing
                    document.querySelectorAll('.nav-item.has-submenu.open').forEach(el => {
                        el.classList.remove('open');
                    });
                    localStorage.setItem('sidebarState', 'collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                    sidebar.classList.add('expanded');
                    localStorage.setItem('sidebarState', 'expanded');
                }
            });
        }

        // Centralized Sidebar Click Handling (Event Delegation)
        sidebar.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link, .submenu a');
            if (!link) return;

            const parentItem = link.closest('.nav-item');
            const isSubmenuToggle = link.classList.contains('submenu-toggle');

            if (isSubmenuToggle) {
                e.preventDefault();
                e.stopPropagation();

                // If sidebar is collapsed, expand it automatically
                if (sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                    sidebar.classList.add('expanded');
                    localStorage.setItem('sidebarState', 'expanded');
                }

                const isOpen = parentItem.classList.contains('open');

                // Accordion behavior: close all other submenus
                document.querySelectorAll('.nav-item.has-submenu.open').forEach(el => {
                    el.classList.remove('open');
                });

                // Toggle current if it wasn't already open
                if (!isOpen) {
                    parentItem.classList.add('open');
                    localStorage.setItem('openSubmenus', JSON.stringify([link.querySelector('.nav-text').textContent.trim()]));
                } else {
                    parentItem.classList.remove('open');
                    localStorage.setItem('openSubmenus', JSON.stringify([]));
                }
            } else {
                // Clicking a main link or sub-link
                // If it's a main link (not in a submenu), close all submenus and clear persistence
                if (!link.closest('.submenu')) {
                    document.querySelectorAll('.nav-item.has-submenu').forEach(el => {
                        el.classList.remove('open');
                        const toggle = el.querySelector('.nav-link');
                        if (toggle) toggle.classList.remove('active');
                    });
                    localStorage.setItem('openSubmenus', JSON.stringify([]));
                    updateSidebarActiveState();
                }
            }
        });

        // Specialized handling for sidebar sub-links to avoid reloads if already on page
        document.querySelectorAll('.submenu a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href) return;

                if (href.includes('clients.html') && window.location.pathname.includes('clients.html')) {
                    const url = new URL(href, window.location.origin);
                    const status = url.searchParams.get('status');

                    const statusFilter = document.getElementById('clientStatusFilter');
                    if (statusFilter) {
                        e.preventDefault();
                        statusFilter.value = status || '';
                        statusFilter.dispatchEvent(new Event('change'));

                        // Update URL without reload if it's just a status filter
                        window.history.pushState({}, '', href);
                        updateSidebarActiveState();
                    }
                }
            });
        });

        sidebar.dataset.initialized = 'true';
    }

    // 2. Initial State Restoration
    restoreSidebarState();

    // 3. Initial Active State
    updateSidebarActiveState();
}

function saveOpenSubmenus() {
    const openMenus = [];
    document.querySelectorAll('.nav-item.has-submenu.open').forEach(el => {
        const text = el.querySelector('.nav-text').textContent.trim();
        openMenus.push(text);
    });
    localStorage.setItem('openSubmenus', JSON.stringify(openMenus));
}

function updateSidebarActiveState() {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const allLinks = document.querySelectorAll('.nav-link, .submenu a');

    // Reset styles
    allLinks.forEach(link => {
        link.classList.remove('active');
        link.style.color = '';
        link.style.fontWeight = '';
        const parent = link.closest('.nav-item.has-submenu');
        if (parent) {
            parent.classList.remove('open');
            const toggle = parent.querySelector('.nav-link');
            if (toggle) toggle.classList.remove('active');
        }
    });

    // Apply active state
    const fullCurrentPath = currentPath + window.location.search;
    let activeParent = null;

    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        const isMatch = (href !== '#' && href === fullCurrentPath) || 
                       (currentPath === 'index.html' && (href === 'index.html' || href === 'index.html' + window.location.search)) ||
                       (href === currentPath && !window.location.search);

        const isRelatedMatch = (currentPath === 'client-profile.html' && href === 'clients.html');

        if (isMatch || isRelatedMatch) {
            if (link.closest('.submenu')) {
                link.style.color = 'var(--accent-red)';
                link.style.fontWeight = '700';
                activeParent = link.closest('.nav-item.has-submenu');
            } else {
                link.classList.add('active');
            }
        }
    });

    // Handle submenu expansion (accordion)
    const allSubmenus = document.querySelectorAll('.nav-item.has-submenu');
    
    if (activeParent) {
        allSubmenus.forEach(menu => {
            if (menu === activeParent) {
                menu.classList.add('open');
                menu.querySelector('.nav-link').classList.add('active');
            } else {
                menu.classList.remove('open');
            }
        });
        localStorage.setItem('openSubmenus', JSON.stringify([activeParent.querySelector('.nav-text').textContent.trim()]));
    } else {
        // We are on a top-level page (no active sub-link)
        // FORCE all submenus to close for a clean accordion experience
        allSubmenus.forEach(menu => {
            menu.classList.remove('open');
            const toggle = menu.querySelector('.nav-link');
            if (toggle) toggle.classList.remove('active');
        });
        localStorage.setItem('openSubmenus', JSON.stringify([]));
    }
}

/**
 * Restores sidebar submenus from localStorage (run once on load)
 */
function restoreSidebarState() {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;

    // 1. Restore Expansion State
    const savedState = localStorage.getItem('sidebarState');
    if (savedState === 'collapsed') {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('expanded');
    }

    // 2. Restore Submenus (if none already opened by active link)
    const openMenusInDom = document.querySelectorAll('.nav-item.has-submenu.open').length;
    if (openMenusInDom === 0) {
        const savedOpenMenus = JSON.parse(localStorage.getItem('openSubmenus') || '[]');
        if (savedOpenMenus.length > 0) {
            const menuText = savedOpenMenus[0];
            const navItems = document.querySelectorAll('.nav-item.has-submenu');
            navItems.forEach(item => {
                const text = item.querySelector('.nav-text').textContent.trim();
                if (text === menuText) {
                    item.classList.add('open');
                }
            });
        }
    }
}

// // Modal interactivity using Event Delegation
function initModal() {
    // We use event delegation on the document to handle all modal triggers
    // This is much safer for SPA navigation as we don't need to re-bind
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        // Add Client Modal Triggers
        if (target.id === 'headerAddClientBtn' || target.id === 'cardAddClientBtn' || target.id === 'clientsPageAddClientBtn' || target.closest('#headerAddClientBtn') || target.closest('#cardAddClientBtn')) {
            const modal = document.getElementById('addClientModal');
            if (modal) modal.classList.add('active');
        }

        // Create Program Modal Triggers
        if (target.id === 'openCreateProgramBtn' || target.closest('#openCreateProgramBtn')) {
            const modal = document.getElementById('createProgramModal');
            if (modal) modal.classList.add('active');
        }

        // Close Modal Triggers
        if (target.id === 'closeModalBtn' || target.id === 'cancelModalBtn' || target.closest('#closeModalBtn')) {
            const modal = document.getElementById('addClientModal');
            if (modal) modal.classList.remove('active');
        }

        if (target.id === 'closeProgramModalBtn' || target.id === 'cancelProgramBtn' || target.closest('#closeProgramModalBtn')) {
            const modal = document.getElementById('createProgramModal');
            if (modal) modal.classList.remove('active');
        }

        // Overlay clicks
        if (target.classList.contains('modal-overlay')) {
            target.classList.remove('active');
        }
    });

    // Form Submissions (Still need individual binding or a generic handler)
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'addClientForm') {
            handleClientSubmit(e);
        } else if (e.target.id === 'createProgramForm') {
            handleProgramSubmit(e);
        }
    });
}

function handleClientSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const newClient = {
        id: formData.get('firstName').toLowerCase() + '-' + formData.get('lastName').toLowerCase() + '-' + Date.now(),
        name: formData.get('firstName') + ' ' + formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        package: formData.get('packageSelect'),
        status: 'active',
        daysLeft: 30,
        avatar: 'https://ui-avatars.com/api/?name=' + formData.get('firstName') + '+' + formData.get('lastName') + '&background=E63946&color=fff',
        goal: 'New client goal pending.',
        timezone: 'Local Time'
    };

    const clients = getClients();
    clients.unshift(newClient);
    localStorage.setItem('alphaFitnessClients', JSON.stringify(clients));

    if (document.querySelector('.clients-list')) {
        renderClients();
        const searchInput = document.getElementById('clientSearchInput');
        if (searchInput) searchInput.dispatchEvent(new Event('input'));
    }

    showToast('Client added successfully!');
    form.reset();
    const modal = document.getElementById('addClientModal');
    if (modal) modal.classList.remove('active');
}

function handleProgramSubmit(e) {
    e.preventDefault();
    showToast('Program created successfully!');
    const modal = document.getElementById('createProgramModal');
    if (modal) modal.style.display = 'none';
    e.target.reset();
}

// Custom Select Implementation
function initCustomSelects() {
    const selects = document.querySelectorAll('select.modern-select');
    selects.forEach(select => {
        // Skip if already initialized
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) return;

        // Hide original select
        select.style.display = 'none';

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.dataset.position === 'up') {
            wrapper.classList.add('open-up');
        }
        wrapper.style.minWidth = select.style.minWidth;
        wrapper.style.width = select.style.width || (select.style.minWidth ? 'auto' : '100%');

        // Create trigger
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';

        const triggerText = document.createElement('span');
        const selectedOption = select.options[select.selectedIndex] || select.options[0];
        triggerText.textContent = selectedOption ? selectedOption.textContent : 'Select...';

        trigger.appendChild(triggerText);
        trigger.insertAdjacentHTML('beforeend', '<i data-lucide="chevron-down" style="width:16px; color:var(--text-muted);"></i>');

        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';

        // Populate options
        Array.from(select.options).forEach((option, index) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-option' + (option.selected ? ' selected' : '') + (option.disabled ? ' disabled' : '');
            optDiv.textContent = option.textContent;
            optDiv.dataset.value = option.value;

            if (!option.disabled) {
                optDiv.addEventListener('click', (e) => {
                    // Update original select
                    select.selectedIndex = index;
                    select.dispatchEvent(new Event('change'));

                    // Update trigger text
                    triggerText.textContent = option.textContent;

                    // Update selected class
                    optionsContainer.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                    optDiv.classList.add('selected');

                    // Close dropdown
                    wrapper.classList.remove('open');
                    e.stopPropagation();
                });
            }
            optionsContainer.appendChild(optDiv);
        });

        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            // Close all others
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
            e.stopPropagation();
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);

        // Insert after original select
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // Re-init lucide icons for the new chevron
        if (window.lucide) {
            window.lucide.createIcons({ root: wrapper });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    });
}

// Add Note Modal Interactivity
function initAddNoteModal() {
    const noteModal = document.getElementById('addNoteModal');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const closeNoteBtn = document.getElementById('closeNoteModalBtn');
    const cancelNoteBtn = document.getElementById('cancelNoteModalBtn');
    const noteForm = document.getElementById('addNoteForm');

    function openNoteModal() {
        if (noteModal) noteModal.classList.add('active');
    }

    function closeNoteModal() {
        if (noteModal) noteModal.classList.remove('active');
    }

    if (addNoteBtn) addNoteBtn.addEventListener('click', openNoteModal);
    if (closeNoteBtn) closeNoteBtn.addEventListener('click', closeNoteModal);
    if (cancelNoteBtn) cancelNoteBtn.addEventListener('click', closeNoteModal);

    if (noteModal) {
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) closeNoteModal();
        });
    }

    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = document.getElementById('noteContent').value;
            // Add the new note to the UI
            const notesSection = addNoteBtn.closest('.card');
            const noteItemHTML = `
                <div class="note-item" style="background: transparent; padding: 0; margin-top: 16px; animation: fadeIn 0.3s ease;">
                    <div style="display: flex; gap: 8px;">
                        <div style="color: #3B82F6; font-size: 18px; line-height: 1;">•</div>
                        <div>
                            ${content.replace(/\n/g, '<br>')}<br>
                            <span class="feed-time" style="margin-top: 6px;">Just now</span>
                        </div>
                    </div>
                </div>
            `;
            notesSection.insertAdjacentHTML('beforeend', noteItemHTML);
            noteForm.reset();
            closeNoteModal();
        });
    }
}

// Lightbox Interactivity
function initLightbox() {
    const galleryImgs = document.querySelectorAll('.gallery-img');
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');

    if (!lightboxModal) return;

    galleryImgs.forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src.replace('w=200&h=200', 'w=1200&h=1200'); // Load higher res version
            lightboxModal.classList.add('active');
        });
    });

    function closeLightbox() {
        lightboxModal.classList.remove('active');
    }

    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);

    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
    });
}

// Client Filtering Logic
function initClientFiltering() {
    const searchInput = document.getElementById('clientSearchInput');
    const statusFilter = document.getElementById('clientStatusFilter');
    const packageFilter = document.getElementById('clientPackageFilter');
    const clientsList = document.querySelector('.clients-list');

    if (!searchInput || !statusFilter || !packageFilter || !clientsList) return;

    function filterClients() {
        const searchTerm = searchInput.value.toLowerCase();

        // Since we use custom selects, their hidden native select is still updated by our JS
        const statusValue = statusFilter.value.toLowerCase();
        const packageValue = packageFilter.value;

        const cards = clientsList.querySelectorAll('.card');

        cards.forEach(card => {
            const name = card.dataset.name || '';
            const email = card.dataset.email || '';
            const status = card.dataset.status || '';
            const pkg = card.dataset.package || '';

            const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);

            let matchesStatus = true;
            if (statusValue) {
                matchesStatus = status === statusValue;
            }

            let matchesPackage = true;
            if (packageValue) {
                matchesPackage = pkg === packageValue;
            }

            if (matchesSearch && matchesStatus && matchesPackage) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', filterClients);
    statusFilter.addEventListener('change', filterClients);
    packageFilter.addEventListener('change', filterClients);

    // Support linking from sidebar active/inactive
    const urlParams = new URLSearchParams(window.location.search);
    const initialStatus = urlParams.get('status');
    if (initialStatus) {
        Array.from(statusFilter.options).forEach((opt, idx) => {
            if (opt.value === initialStatus) {
                statusFilter.selectedIndex = idx;

                // We also need to update the custom UI trigger text if it exists
                const wrapper = statusFilter.nextElementSibling;
                if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                    wrapper.querySelector('.custom-select-trigger span').textContent = opt.textContent;
                    wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
                    const selectedOptDiv = wrapper.querySelector(`.custom-option[data-value="${opt.value}"]`);
                    if (selectedOptDiv) selectedOptDiv.classList.add('selected');
                }
            }
        });
        filterClients();
    }
}

// Client State Management
const defaultClients = [
    {
        id: 'ben-andrew',
        name: 'Ben Andrew',
        email: 'ben@demo.com',
        status: 'active',
        package: 'rookie',
        daysLeft: 14,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        goal: 'Run a marathon without stopping to walk.',
        timezone: '20:03 - America/Los_Angeles'
    },
    {
        id: 'jessica-smith',
        name: 'Jessica Smith',
        email: 'jessica@demo.com',
        status: 'active',
        package: 'advanced',
        daysLeft: 5,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
        goal: 'Increase overall strength.',
        timezone: '15:03 - America/New_York'
    },
    {
        id: 'marcus-johnson',
        name: 'Marcus Johnson',
        email: 'marcus@demo.com',
        status: 'inactive',
        package: 'one-month-1',
        daysLeft: 0,
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
        goal: 'Recover from injury and regain mobility.',
        timezone: '20:03 - Europe/London',
        inactiveStyle: true
    }
];

function initClientState() {
    if (!localStorage.getItem('alphaFitnessClients')) {
        localStorage.setItem('alphaFitnessClients', JSON.stringify(defaultClients));
    }
}

function getClients() {
    return JSON.parse(localStorage.getItem('alphaFitnessClients') || '[]');
}

function renderClients() {
    const clientsList = document.querySelector('.clients-list');
    if (!clientsList) return;

    const clients = getClients();
    clientsList.innerHTML = '';

    const packageDisplayNames = {
        'rookie': 'Rookie Bundle',
        'intermediate': 'Intermediate Bundle',
        'advanced': 'Advanced Bundle',
        'annual': 'Annual Package',
        'one-month-1': 'One Month Package 1',
        'one-month-2': 'One Month Package 2',
        'training-plan': 'Training Plan Only 6 Weeks'
    };

    clients.forEach(client => {
        const opacity = client.inactiveStyle || client.status === 'inactive' ? '0.7' : '1';
        const filter = client.inactiveStyle || client.status === 'inactive' ? 'grayscale(100%)' : 'none';
        const pkgName = packageDisplayNames[client.package] || client.package;

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.name = client.name.toLowerCase();
        card.dataset.email = client.email.toLowerCase();
        card.dataset.status = client.status;
        card.dataset.package = client.package;
        card.style.cssText = `padding: 16px; display: flex; flex-direction: column; justify-content: space-between; aspect-ratio: 1 / 1; opacity: ${opacity}; animation: fadeIn 0.3s ease;`;

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <img src="${client.avatar}" class="avatar-header" style="width: 60px; height: 60px; border-radius: 12px; filter: ${filter};">
                <div>
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0;">${client.name}</h3>
                    <span style="color: var(--text-muted); font-size: 13px;">${client.email}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; background: var(--bg-light); padding: 12px; border-radius: var(--radius-md);">
                <div>
                    <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Days Left</div>
                    <div style="font-weight: 700; color: var(--accent-red); margin-top: 4px;">${client.daysLeft} Days</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Package</div>
                    <div style="font-weight: 600; color: var(--text-main); margin-top: 4px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${pkgName}">${pkgName}</div>
                </div>
            </div>

            <a href="client-profile.html?id=${client.id}" class="btn-view-profile">View Profile</a>
        `;
        clientsList.appendChild(card);
    });
}

function showToast(message) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 12px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i data-lucide="check-circle" style="color: var(--accent-green);"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    if (window.lucide) window.lucide.createIcons({ root: toast });

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initProfilePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

    if (!document.querySelector('.client-brand')) return;

    if (clientId) {
        const clients = getClients();
        const client = clients.find(c => c.id === clientId);
        if (client) {
            // Update Header
            const headerAvatar = document.querySelector('.client-brand img');
            const headerName = document.querySelector('.client-brand .client-name');
            if (headerAvatar) {
                headerAvatar.src = client.avatar;
                headerAvatar.alt = client.name;
            }
            if (headerName) headerName.textContent = client.name;

            // Update Profile Info card
            const profileInfo = document.querySelector('.profile-info');
            if (profileInfo) {
                profileInfo.innerHTML = `
                    <div class="info-item"><i data-lucide="mail"></i> ${client.email}</div>
                    <div class="info-item"><i data-lucide="home"></i> ${client.timezone || 'Local Time'}</div>
                `;
            }

            // Update General Goal
            const goalElem = document.querySelector('.note-item span');
            if (goalElem && client.goal) goalElem.textContent = client.goal;

            // Refresh icons
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

// --- SPA Navigation Logic ---
async function handleNavigation(url, addToHistory = true) {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.split('/').pop() || 'index.html';
    
    // Don't intercept external links or empty links
    if (!url || url === '#') return;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const newMain = doc.querySelector('.main-wrapper');
        const currentMain = document.querySelector('.main-wrapper');
        
        if (newMain && currentMain) {
            // Update the main content
            currentMain.innerHTML = newMain.innerHTML;
            
            // Update the title
            document.title = doc.title;

            // Update URL
            if (addToHistory) {
                window.history.pushState({ url }, '', url);
            }

            // Re-initialize all interactive components
            initAllComponents();
            
            // Ensure sidebar highlighting is updated
            initSidebar(); 
            updateSidebarActiveState();
        }
    } catch (error) {
        console.error('SPA Navigation Error:', error);
        // Fallback to normal navigation if fetch fails
        if (addToHistory) window.location.href = url;
    }
}

function initAllComponents() {
    // Initial icon creation
    if (window.lucide) window.lucide.createIcons();
    
    initClientState();
    renderClients();
    initCharts();
    initInteractivity();
    initCustomSelects();
    initAddNoteModal();
    initLightbox();
    initClientFiltering();
    initProfilePage();
}

// Global click interceptor for navigation
function initLinkInterception() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        // Only intercept internal dashboard links
        const internalPages = ['index.html', 'clients.html', 'client-profile.html', 'programs.html', 'meal-plans.html'];
        const isInternal = internalPages.some(page => href.includes(page));

        if (isInternal) {
            e.preventDefault();
            handleNavigation(href);
        }
    });
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.url) {
        handleNavigation(e.state.url, false);
    } else {
        handleNavigation(window.location.pathname, false);
    }
});

// Run on load
document.addEventListener('DOMContentLoaded', () => {
    initSidebar(); // Initialize sidebar once (it stays fixed)
    initLinkInterception(); // Start intercepting links
    initModal(); // Initialize global modal listeners
    initAllComponents(); // Initial page load components
    
    console.log("AlphaFitness SPA Dashboard Initialized");
});
