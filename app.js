// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAbXNhSvkuFtUpo-m7v0TYxBJ8OpWEvfOk",
    authDomain: "expense-tracker-cd845.firebaseapp.com",
    projectId: "expense-tracker-cd845",
    storageBucket: "expense-tracker-cd845.firebasestorage.app",
    messagingSenderId: "388614906285",
    appId: "1:388614906285:web:da4bbfe7a395096adf0124",
    measurementId: "G-204GS4X9TT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
const categorySummaryContainer = document.getElementById('category-summary');

const categories = {
    expense: [
        { id: 'food', name: 'ค่าอาหาร', icon: 'fa-utensils', color: '#f59e0b' },
        { id: 'travel', name: 'ค่าเดินทาง', icon: 'fa-car', color: '#10b981' },
        { id: 'bill', name: 'ค่าบัตรเครดิต/บิล', icon: 'fa-credit-card', color: '#3b82f6' },
        { id: 'shopping', name: 'ค่า shopping', icon: 'fa-shopping-bag', color: '#ec4899' },
        { id: 'insurance', name: 'ค่าประกัน', icon: 'fa-shield-alt', color: '#8b5cf6' },
        { id: 'other_exp', name: 'อื่นๆ', icon: 'fa-ellipsis-h', color: '#64748b' }
    ],
    income: [
        { id: 'salary', name: 'เงินเดือน', icon: 'fa-money-bill-wave', color: '#10b981' },
        { id: 'bonus', name: 'โบนัส', icon: 'fa-gift', color: '#f59e0b' },
        { id: 'other_inc', name: 'อื่นๆ', icon: 'fa-coins', color: '#3b82f6' }
    ]
};

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

let transactions = [];

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
            if (error.code === 'permission-denied') {
                alert('กรุณาไปที่ Firebase Console และตั้งค่า Rules ของ Firestore เป็นโหมดทดสอบ (Test Mode) หรืออนุญาตให้เขียน/อ่านได้ค่ะ');
            }
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
            alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการตั้งค่า Firebase Rules');
        }
    }
}

// Get category name
function getCategoryName(t, cId) {
    const cat = categories[t].find(c => c.id === cId);
    return cat ? cat.name : 'Unknown';
}

// Get category info
function getCategoryInfo(cId) {
    let allCats = [...categories.expense, ...categories.income];
    return allCats.find(c => c.id === cId) || { icon: 'fa-question', color: '#64748b', name: 'อื่นๆ' };
}

// Add transactions to list
function addTransactionDOM(transaction) {
    const sign = transaction.type === 'income' ? '+' : '-';
    const item = document.createElement('li');
    const catInfo = getCategoryInfo(transaction.category);

    item.classList.add(transaction.type);

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

    // Global Balance (All time)
    const allAmounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const totalBalance = allAmounts.reduce((acc, item) => (acc += item), 0);

    // Monthly Values
    const filteredTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .map(t => t.amount)
        .reduce((acc, item) => (acc += item), 0);

    const expense = filteredTransactions
        .filter(t => t.type === 'expense')
        .map(t => t.amount)
        .reduce((acc, item) => (acc += item), 0);

    balance.innerText = `฿${formatNumber(totalBalance)}`;
    totalIncome.innerText = `+฿${formatNumber(income)}`;
    totalExpense.innerText = `-฿${formatNumber(expense)}`;

    // Update displays
    currentMonthDisplay.innerText = `(${formatMonthDisplay(selectedMonth)})`;
    summaryMonthDisplay.innerText = `(${formatMonthDisplay(selectedMonth)})`;

    updateCategorySummary(filteredTransactions, expense);
}

// Format Month Display
function formatMonthDisplay(monthStr) {
    const [year, month] = monthStr.split('-');
    const d = new Date(year, month - 1);
    return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

// Update Category Summary
function updateCategorySummary(filteredTransactions, totalExpense) {
    categorySummaryContainer.innerHTML = '';

    if (totalExpense === 0) {
        categorySummaryContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้</p>';
        return;
    }

    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const summaryData = {};

    categories.expense.forEach(cat => {
        summaryData[cat.id] = 0;
    });

    expenseTransactions.forEach(t => {
        summaryData[t.category] += t.amount;
    });

    Object.entries(summaryData).forEach(([catId, amount]) => {
        if (amount > 0) {
            const catInfo = getCategoryInfo(catId);
            const percent = ((amount / totalExpense) * 100).toFixed(0);

            const catItem = document.createElement('div');
            catItem.classList.add('category-item');
            catItem.innerHTML = `
                <div class="category-header">
                    <div class="category-name">
                        <i class="fas ${catInfo.icon}" style="color: ${catInfo.color}"></i>
                        <span>${catInfo.name}</span>
                    </div>
                    <span class="category-amount">฿${formatNumber(amount)} (${percent}%)</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percent}%; background: ${catInfo.color}"></div>
                </div>
            `;
            categorySummaryContainer.appendChild(catItem);
        }
    });
}

// Remove transaction from Firebase
async function removeTransaction(id) {
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        try {
            await db.collection('transactions').doc(id).delete();
        } catch (error) {
            console.error("Error removing document: ", error);
            alert('ไม่สามารถลบข้อมูลได้');
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

populateCategories();
syncWithFirebase(); // Start Firestore sync

form.addEventListener('submit', addTransaction);
monthFilter.addEventListener('change', init);
