let db;

// Initialize App
function initializeApp() {
    const env = window.ENV;
    if (!env) {
        alert('ไม่สามารถโหลดค่ากำหนดได้ (env.js missing)');
        return;
    }

    const firebaseConfig = {
        apiKey: env.FB_API_KEY,
        authDomain: env.FB_AUTH_DOMAIN,
        projectId: env.FB_PROJECT_ID,
        storageBucket: env.FB_STORAGE_BUCKET,
        messagingSenderId: env.FB_MESSAGING_SENDER_ID,
        appId: env.FB_APP_ID,
        measurementId: env.FB_MEASUREMENT_ID
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    // Start App Logic
    populateCategories();
    syncWithFirebase();
}

// Global UI Elements

// PIN Lock Configuration
const APP_PIN = "1234";
const pinOverlay = document.getElementById('pin-overlay');
const mainContent = document.getElementById('main-content');
const pinInput = document.getElementById('pin-input');
const unlockBtn = document.getElementById('unlock-btn');
const pinError = document.getElementById('pin-error');

// Check PIN on load
if (sessionStorage.getItem('app_unlocked') === 'true') {
    pinOverlay.style.display = 'none';
    mainContent.style.display = 'block';
}

function handleUnlock() {
    if (pinInput.value === APP_PIN) {
        sessionStorage.setItem('app_unlocked', 'true');
        pinOverlay.style.opacity = '0';
        setTimeout(() => {
            pinOverlay.style.display = 'none';
            mainContent.style.display = 'block';
        }, 300);
        init(); // Re-initialize to show data
    } else {
        pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
    }
}

const lockAppBtn = document.getElementById('lock-app-btn');

function handleLock() {
    sessionStorage.removeItem('app_unlocked');
    pinInput.value = '';
    pinOverlay.style.opacity = '1';
    pinOverlay.style.display = 'flex';
    mainContent.style.display = 'none';
}

unlockBtn.addEventListener('click', handleUnlock);
lockAppBtn.addEventListener('click', handleLock);
pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUnlock();
});

const balance = document.getElementById('balance');
const totalIncome = document.getElementById('total-income');
const totalExpense = document.getElementById('total-expense');
const list = document.getElementById('list');
const form = document.getElementById('transaction-form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const type = document.getElementById('type');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const monthFilter = document.getElementById('month-filter');
const currentMonthDisplay = document.getElementById('current-month-display');
const summaryMonthDisplay = document.getElementById('summary-month-display');
const totalSavingsDisplay = document.getElementById('total-savings');
const totalWealthDisplay = document.getElementById('total-wealth');
const categorySummaryContainer = document.getElementById('category-summary');

const categories = {
    income: [
        { id: 'salary', name: 'เงินเดือน', icon: 'fa-money-bill-wave', color: '#6d7a5d' },
        { id: 'bonus', name: 'โบนัส', icon: 'fa-gift', color: '#c4a484' },
        { id: 'other_inc', name: 'อื่นๆ', icon: 'fa-coins', color: '#8c8c8c' }
    ],
    expense: [
        { id: 'food', name: 'ค่าอาหาร', icon: 'fa-utensils', color: '#c9625d' },
        { id: 'travel', name: 'ค่าเดินทาง', icon: 'fa-car', color: '#7a8a66' },
        { id: 'bill', name: 'ค่าบิล/บัตร', icon: 'fa-credit-card', color: '#5d7a9e' },
        { id: 'shopping', name: 'ช้อปปิ้ง', icon: 'fa-shopping-bag', color: '#d1a054' },
        { id: 'insurance', name: 'ประกัน', icon: 'fa-shield-alt', color: '#8c847d' },
        { id: 'other_exp', name: 'อื่นๆ', icon: 'fa-ellipsis-h', color: '#aaaaaa' }
    ],
    savings: [
        { id: 'bank', name: 'ฝากธนาคาร', icon: 'fa-university', color: '#d1a054' },
        { id: 'investment', name: 'ลงทุน', icon: 'fa-chart-line', color: '#6d7a5d' },
        { id: 'emergency', name: 'สำรองฉุกเฉิน', icon: 'fa-shuttle-van', color: '#c9625d' },
        { id: 'other_save', name: 'ออมอื่นๆ', icon: 'fa-piggy-bank', color: '#8c847d' }
    ],
    withdraw: [
        { id: 'use_save', name: 'เอาเงินออมมาใช้', icon: 'fa-hand-holding-usd', color: '#5d7a9e' }
    ]
};

let transactions = [];
let myPieChart = null;

// Initialize categories in select
function populateCategories() {
    const selectedType = type.value;
    categorySelect.innerHTML = '';
    categories[selectedType].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

type.addEventListener('change', populateCategories);

// Set default date to today
const today = new Date();
const formattedDate = today.toISOString().split('T')[0];
dateInput.value = formattedDate;

// Set default filter to current month
const currentMonthStr = today.toISOString().slice(0, 7);
monthFilter.value = currentMonthStr;

// Sync with Firestore
function syncWithFirebase() {

    db.collection('transactions')
        .orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
            transactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            init(); // Re-render when data changes
        }, (error) => {
            console.error("Firebase Snapshot Error: ", error);
        });
}

// Add transaction to Firebase
async function addTransaction(e) {
    e.preventDefault();

    if (amount.value.trim() === '' || dateInput.value === '') {
        alert('กรุณาระบุจำนวนเงินและวันที่');
    } else {
        const transaction = {
            type: type.value,
            category: categorySelect.value,
            text: text.value || getCategoryName(type.value, categorySelect.value),
            amount: +amount.value,
            date: dateInput.value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('transactions').add(transaction);
            text.value = '';
            amount.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
            alert('ไม่สามารถบันทึกข้อมูลได้');
        }
    }
}

// Get category name
function getCategoryName(t, cId) {
    const catList = categories[t];
    const cat = catList.find(c => c.id === cId);
    return cat ? cat.name : 'Unknown';
}

// Add transactions to list
function addTransactionDOM(transaction) {
    let sign = '';
    let colorClass = '';

    if (transaction.type === 'income') {
        sign = '+';
        colorClass = 'income';
    } else if (transaction.type === 'expense') {
        sign = '-';
        colorClass = 'expense';
    } else if (transaction.type === 'savings') {
        sign = '📤'; // Out to Savings
        colorClass = 'savings';
    } else {
        sign = '📥'; // In from Savings
        colorClass = 'withdraw';
    }

    const item = document.createElement('li');
    const catInfo = getCategoryInfo(transaction.category);

    item.classList.add(colorClass);

    item.innerHTML = `
        <div class="transaction-info">
            <span class="transaction-category">${catInfo.name}</span>
            <span class="transaction-name">${transaction.text}</span>
            <span class="transaction-date">${formatThaiDate(transaction.date)}</span>
        </div>
        <span class="transaction-amount">
            ${sign}${formatNumber(transaction.amount)}
        </span>
        <button class="delete-btn" onclick="removeTransaction('${transaction.id}')">
            <i class="fas fa-trash"></i>
        </button>
    `;

    list.appendChild(item);
}

// Format Thai Date
function formatThaiDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format Number with Comma
function formatNumber(num) {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Update values in UI
function updateValues() {
    const selectedMonth = monthFilter.value;
    const filteredTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

    // 1. Calculate Current Wallet Balance (All-time, not filtered by month)
    const allIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const allExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const allWithdrawal = transactions
        .filter(t => t.type === 'withdraw')
        .reduce((acc, t) => acc + t.amount, 0);

    const currentWalletBalance = (allIncome + allWithdrawal) - allExpense;

    // 2. Monthly summary (filtered by selected month) - for display only
    const monthlyIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const monthlyExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    // 3. Calculate Total Net Savings (Cumulative)
    const totalDeposited = transactions
        .filter(t => t.type === 'savings')
        .reduce((acc, t) => acc + t.amount, 0);

    const totalWithdrawn = transactions
        .filter(t => t.type === 'withdraw')
        .reduce((acc, t) => acc + t.amount, 0);

    const currentTotalSavings = totalDeposited - totalWithdrawn;

    // 4. Calculate Total Wealth (Net Worth)
    const totalWealth = allIncome - allExpense;

    // Update Headings
    balance.innerText = `฿${formatNumber(currentWalletBalance)}`;
    totalSavingsDisplay.innerText = `฿${formatNumber(currentTotalSavings)}`;
    totalWealthDisplay.innerText = `฿${formatNumber(totalWealth)}`;

    // Update Monthly Summaries
    totalIncome.innerText = `+฿${formatNumber(monthlyIncome)}`;
    totalExpense.innerText = `-฿${formatNumber(monthlyExpense)}`;

    const date = new Date(selectedMonth + '-01');
    const monthText = date.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
    summaryMonthDisplay.innerText = `(${monthText})`;
    currentMonthDisplay.innerText = `(${monthText})`;

    updateCategorySummary(filteredTransactions, monthlyExpense);
    updatePieChart(filteredTransactions);
}

// Format Month Display
function formatMonthDisplay(monthStr) {
    const [year, month] = monthStr.split('-');
    const d = new Date(year, month - 1);
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Update Category Summary
function updateCategorySummary(filteredTransactions, totalExpense) {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    categorySummaryContainer.innerHTML = '';

    if (expenses.length === 0) {
        categorySummaryContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">ยังไม่มีรายการใช้จ่ายในเดือนนี้</p>';
        return;
    }

    Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]).forEach(catId => {
        const amount = categoryTotals[catId];
        const percent = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(0) : 0;
        const catInfo = getCategoryInfo(catId);

        const div = document.createElement('div');
        div.classList.add('category-item');
        div.innerHTML = `
            <div class="category-header">
                <div class="category-name">
                    <span style="color: ${catInfo.color}"><i class="fas fa-circle"></i></span>
                    ${catInfo.name}
                </div>
                <div class="category-amount">฿${formatNumber(amount)} (${percent}%)</div>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${catInfo.color}"></div>
            </div>
        `;
        categorySummaryContainer.appendChild(div);
    });
}

// Update Pie Chart
function updatePieChart(filteredTransactions) {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const chartCanvas = document.getElementById('expensePieChart');
    const noDataMsg = document.getElementById('no-data-msg');

    if (expenses.length === 0) {
        chartCanvas.style.display = 'none';
        noDataMsg.style.display = 'block';
        if (myPieChart) {
            myPieChart.destroy();
            myPieChart = null;
        }
        return;
    }

    chartCanvas.style.display = 'block';
    noDataMsg.style.display = 'none';

    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals).map(catId => getCategoryInfo(catId).name);
    const data = Object.values(categoryTotals);
    const backgroundColors = Object.keys(categoryTotals).map(catId => {
        return getCategoryInfo(catId).color;
    });

    if (myPieChart) {
        myPieChart.data.labels = labels;
        myPieChart.data.datasets[0].data = data;
        myPieChart.data.datasets[0].backgroundColor = backgroundColors;
        myPieChart.update();
    } else {
        myPieChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    label += '฿' + formatNumber(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// Helper to get category info
function getCategoryInfo(catId) {
    for (const type in categories) {
        const cat = categories[type].find(c => c.id === catId);
        if (cat) return cat;
    }
    return { name: catId, icon: 'fa-question', color: '#94a3b8' };
}

// Helper to get category name (backward compatibility)
function getCategoryName(typeStr, catId) {
    const cat = categories[typeStr]?.find(c => c.id === catId);
    return cat ? cat.name : catId;
}

// Remove transaction from Firebase
async function removeTransaction(id) {
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        try {
            await db.collection('transactions').doc(id).delete();
        } catch (error) {
            console.error("Error removing document: ", error);
        }
    }
}

// Init app
function init() {
    list.innerHTML = '';
    const selectedMonth = monthFilter.value;

    const filteredTransactions = transactions
        .filter(t => t.date.startsWith(selectedMonth))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredTransactions.forEach(addTransactionDOM);
    updateValues();
}

// Export Functions
function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function exportToJSON() {
    const dataStr = JSON.stringify(transactions, null, 2);
    downloadFile(dataStr, `expense_data_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
}

function exportToCSV() {
    if (transactions.length === 0) {
        alert('ยังไม่มีข้อมูลให้ส่งออกค่ะ');
        return;
    }

    let csvContent = "\uFEFF";
    csvContent += "วันที่,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n";

    transactions.forEach(t => {
        const catName = getCategoryName(t.type, t.category);
        let typeThai = '';
        if (t.type === 'income') typeThai = 'รายรับ';
        else if (t.type === 'expense') typeThai = 'รายจ่าย';
        else if (t.type === 'savings') typeThai = 'เงินออม (ฝาก)';
        else typeThai = 'เงินออม (ถอน)';

        csvContent += `${t.date},${typeThai},${catName},${t.text.replace(/,/g, ' ')},${t.amount}\n`;
    });

    downloadFile(csvContent, `expense_report_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
}

// Initialize application
initializeApp();

form.addEventListener('submit', addTransaction);
monthFilter.addEventListener('change', init);
