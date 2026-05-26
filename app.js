// --- Global States (Unified) ---
let inputMode = 'pretax'; // 'pretax' or 'posttax'
let selectedYear = '2026'; // '2026', '2027', or '2028'
let selectedPreset = 'CL2'; // 'CL2', 'CL3', 'CL4', 'CL5'
let savingRatio = 50; // percentage
let investmentType = 'cash'; // 'cash', 'sp500', 'nasdaq'
let tickerInterval = null;
let currentTickerAmount = 0;

// --- National Growth Fund Global States ---
let ngfSalary = 50000000;          // 하이닉스 성과급 포함 세전 총소득 (소득 과세표준 기준)
let ngfAnnualInvestment = 30000000; // 연 납입금 (1천만 ~ 1억)
let ngfExpectedReturn = 10;        // 5년 누적 펀드 세전 자체 수익률 (%)
let genExpectedReturn = 10;        // 일반 투자 (ETF 등) 만기 세전 수익률 (%)
let ngfTaxShieldActive = false;     // 금융소득종합과세 방어막 가동 여부
let ngfResultTabMode = 'simple';    // 'simple' or 'detailed'
let auditConsoleExpanded = false;   // 아코디언 상태

// --- Patriotic Tax Card & Real-time Wage Ticker States ---
let taxPatriotIndex = 0;
const taxPatriotList = [
    {
        name: '아동 급식',
        cost: 8000,
        unit: '끼니',
        icon: '🍱',
        desc: (tax, count) => `선택하신 하이닉스 임직원이 1년 동안 납부하는 소득세+지방세(<b>${formatKoreanPrice(tax)}</b>)로 결식 우려 아동들에게 따뜻한 <b>아동 급식 ${formatNumber(count)}끼니</b>를 무료 지원할 수 있는 소중한 재원입니다. (클릭 시 다른 예시)`
    },
    {
        name: '소방관 특수 방화복',
        cost: 350000,
        unit: '벌',
        icon: '🚒',
        desc: (tax, count) => `선택하신 하이닉스 임직원이 1년 동안 납부하는 소득세+지방세(<b>${formatKoreanPrice(tax)}</b>)로 재난 현장에서 생명을 구하는 소방관님들의 <b>특수 방화복 ${formatNumber(count)}벌</b>을 구매 지원할 수 있습니다. (클릭 시 다른 예시)`
    },
    {
        name: '소외계층 연탄 후원',
        cost: 900,
        unit: '장',
        icon: '🔥',
        desc: (tax, count) => `선택하신 하이닉스 임직원이 1년 동안 납부하는 소득세+지방세(<b>${formatKoreanPrice(tax)}</b>)로 에너지 취약 계층의 따뜻한 겨울을 위한 <b>따뜻한 연탄 ${formatNumber(count)}장</b>을 배달 후원할 수 있는 자원입니다. (클릭 시 다른 예시)`
    },
    {
        name: '저소득 대학생 장학금',
        cost: 3500000,
        unit: '학기분',
        icon: '🎓',
        desc: (tax, count) => `선택하신 하이닉스 임직원이 1년 동안 납부하는 소득세+지방세(<b>${formatKoreanPrice(tax)}</b>)로 어려운 환경에서도 꿈을 키워가는 <b>대학생 ${formatNumber(count)}학기분 장학금</b>을 전액 지원해 줄 수 있습니다. (클릭 시 다른 예시)`
    },
    {
        name: '유기동물 사료 후원',
        cost: 30000,
        unit: '포대',
        icon: '🐶',
        desc: (tax, count) => `선택하신 하이닉스 임직원이 1년 동안 납부하는 소득세+지방세(<b>${formatKoreanPrice(tax)}</b>)로 상처받은 유기동물들이 배부르게 먹을 수 있는 <b>반려동물 사료 ${formatNumber(count)}포대</b>를 쉼터에 기부할 수 있습니다. (클릭 시 다른 예시)`
    }
];

let clockMode = 'odometer'; // 'odometer', 'hourglass', 'matcher'
let clockInterval = null;
let clockStartTime = 0;
let clockCumulativeEarnings = 0;
let hourglassCanvas = null;
let hourglassCtx = null;
let hourglassCoins = [];
let hourglassLastCoinTime = 0;
let hourglassAnimFrame = null;

const consumptionItems = [
    { id: 'matcher-val-coffee', cost: 4500, unit: '잔' },
    { id: 'matcher-val-chicken', cost: 22000, unit: '마리' },
    { id: 'matcher-val-ramyun', cost: 1100, unit: '개' },
    { id: 'matcher-val-airpods', cost: 350000, unit: '개' },
    { id: 'matcher-val-tanghulu', cost: 4000, unit: '꼬치' },
    { id: 'matcher-val-screw', cost: 1500, unit: '개' }
];

// Export to window for backward compatibility
window.selectedYear = selectedYear;
window.selectedPreset = selectedPreset;
window.savingRatio = savingRatio;
window.investmentType = investmentType;
window.ngfSalary = ngfSalary;

// --- SK Hynix Database ---
const hynixDB = {
    baseSalary: {
        CL2: 50000000, // 5천만 원
        CL3: 62000000, // 6천2백만 원
        CL4: 78000000, // 7천8백만 원
        CL5: 98000000  // 9천8백만 원
    },
    // 실제 및 예측 연도별 연간 영업이익 (조 원 단위)
    // 2026년 지급분 (2025년 실적): 실제 47.2063조 원
    // 2027년 지급분 (2026년 실적): 맥쿼리 전망 272.0조 원
    // 2028년 지급분 (2027년 실적): 맥쿼리 전망 447.0조 원
    financials: {
        '2026': { op: 47.2063 },
        '2027': { op: 272.0 },
        '2028': { op: 447.0 }
    }
};

// --- Korean Tax and Insurance Calculation (2025/2026 기준) ---
function calculateNetSalary(annualSalary) {
    if (annualSalary <= 0) {
        return { monthlyNet: 0, annualNet: 0, insurance: 0, tax: 0, pension: 0, health: 0, longTerm: 0, employment: 0, incomeTax: 0, localTax: 0 };
    }

    const monthlySalary = Math.floor(annualSalary / 12);
    
    // 1. 비과세 식대 공제액 (월 200,000원 가정)
    const nonTaxable = 200000;
    const taxableMonthly = Math.max(0, monthlySalary - nonTaxable);
    
    // 4대 보험 계산
    // 국민연금: 4.5% (월 상한액 265,500원 적용, 기준소득월액 상한액 약 5,900,000원 반영)
    const pension = Math.min(265500, Math.floor(taxableMonthly * 0.045));
    
    // 건강보험: 3.545%
    const health = Math.floor(taxableMonthly * 0.03545);
    
    // 장기요양보험: 건강보험료의 12.95%
    const longTerm = Math.floor(health * 0.1295);
    
    // 고용보험: 0.9%
    const employment = Math.floor(taxableMonthly * 0.009);
    
    const monthlyInsuranceSum = pension + health + longTerm + employment;
    
    // 2. 근로소득세 계산 (연간 기준 근로소득공제 산출)
    const annualTaxable = Math.max(0, annualSalary - (nonTaxable * 12));
    let incomeDeduction = 0;
    
    if (annualTaxable <= 5000000) {
        incomeDeduction = annualTaxable * 0.7;
    } else if (annualTaxable <= 15000000) {
        incomeDeduction = 3500000 + (annualTaxable - 5000000) * 0.4;
    } else if (annualTaxable <= 45000000) {
        incomeDeduction = 7500000 + (annualTaxable - 15000000) * 0.15;
    } else if (annualTaxable <= 100000000) {
        incomeDeduction = 12000000 + (annualTaxable - 45000000) * 0.05;
    } else {
        incomeDeduction = 14750000 + (annualTaxable - 100000000) * 0.02;
    }
    
    // 근로소득금액 도출
    const earnedIncomeAmount = Math.max(0, annualTaxable - incomeDeduction);
    
    // 인적공제 기본 1인 (본인 1,500,000원) 적용
    const taxableBase = Math.max(0, earnedIncomeAmount - 1500000);
    
    // 기본세율 누진 구간별 세액 계산
    let incomeTax = 0;
    if (taxableBase <= 14000000) {
        incomeTax = taxableBase * 0.06;
    } else if (taxableBase <= 50000000) {
        incomeTax = 840000 + (taxableBase - 14000000) * 0.15;
    } else if (taxableBase <= 88000000) {
        incomeTax = 6240000 + (taxableBase - 50000000) * 0.24;
    } else if (taxableBase <= 150000000) {
        incomeTax = 15360000 + (taxableBase - 88000000) * 0.35;
    } else if (taxableBase <= 300000000) {
        incomeTax = 37060000 + (taxableBase - 150000000) * 0.38;
    } else if (taxableBase <= 500000000) {
        incomeTax = 94060000 + (taxableBase - 300000000) * 0.40;
    } else {
        // 초고소득자 간이 세율화
        incomeTax = 174060000 + (taxableBase - 500000000) * 0.42;
    }
    
    // 월 소득세 및 지방소득세(10%) 산출
    const monthlyIncomeTax = Math.floor(incomeTax / 12);
    const monthlyLocalTax = Math.floor(monthlyIncomeTax * 0.1);
    
    const monthlyTaxSum = monthlyIncomeTax + monthlyLocalTax;
    
    // 세후 월 실수령액
    const monthlyNet = Math.max(0, monthlySalary - monthlyInsuranceSum - monthlyTaxSum);
    
    return {
        monthlyNet: monthlyNet,
        annualNet: monthlyNet * 12,
        insurance: monthlyInsuranceSum * 12,
        tax: monthlyTaxSum * 12,
        
        pension: pension * 12,
        health: health * 12,
        longTerm: longTerm * 12,
        employment: employment * 12,
        incomeTax: monthlyIncomeTax * 12,
        localTax: monthlyLocalTax * 12
    };
}

// --- 실수령액(세후 연 소득) -> 세전 연봉 초고속 역산 (이진 탐색) ---
function reverseCalculateGross(targetAnnualNet) {
    if (targetAnnualNet <= 0) return 0;
    
    let low = 5000000;      // 5백만 원
    let high = 5000000000;  // 50억 원
    let mid = 0;
    let iterations = 0;
    
    while (low <= high && iterations < 60) {
        mid = Math.floor((low + high) / 2);
        const calc = calculateNetSalary(mid);
        
        if (Math.abs(calc.annualNet - targetAnnualNet) < 100) {
            return mid;
        }
        
        if (calc.annualNet < targetAnnualNet) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
        iterations++;
    }
    return mid;
}

// --- Get Selected Hynix Salary Model ---
function getHynixSalaryData() {
    const base = hynixDB.baseSalary[selectedPreset];
    const fin = hynixDB.financials[selectedYear];
    
    // 월 기본급 = 연 기본급 / 20 (하이닉스 공식 성과급 기본급 산정 규칙: 연봉의 1/20)
    const monthlyBase = base / 20;
    
    // 성과급 비례 연동 공식 (2025년 실적 47.2063조 기준 PS 2,964% 비례 연동)
    // psRate = (영업이익 / 47.2063) * 2,964%
    const psRate = (fin.op / 47.2063) * 29.64;
    const piRate = 2.0; // PI 200% 고정
    
    const totalBonus = Math.floor(monthlyBase * (psRate + piRate));
    
    // 총 세전 연봉 = 연 기본급 + 성과급 총액
    const grossTotal = Math.floor(base + totalBonus);
    
    return {
        base: base,
        bonus: totalBonus,
        gross: grossTotal,
        details: calculateNetSalary(grossTotal)
    };
}

// --- Input Handling & UI Trigger ---
function switchInputType(mode) {
    inputMode = mode;
    
    // Update active tab buttons
    document.getElementById('btn-pretax').classList.toggle('active', mode === 'pretax');
    document.getElementById('btn-posttax').classList.toggle('active', mode === 'posttax');
    
    const label = document.getElementById('salary-input-label');
    const unit = document.getElementById('salary-input-unit');
    const input = document.getElementById('salary-input');
    
    // Read current value, try to convert nicely
    let rawVal = parseFormattedNumber(input.value);
    
    if (mode === 'pretax') {
        label.innerText = '세전 연 연봉 입력';
        unit.innerText = '원';
        // If switched from post-tax monthly to pre-tax annual, approximate reverse gross
        if (rawVal < 25000000) { // likely was monthly net
            const annualNet = rawVal * 12;
            const approximatedGross = reverseCalculateGross(annualNet);
            input.value = formatNumber(approximatedGross);
        }
    } else {
        label.innerText = '세후 월 실수령액 입력';
        unit.innerText = '원 / 월';
        // If switched from pre-tax annual to post-tax monthly, calculate net monthly
        if (rawVal >= 10000000) { // likely was annual gross
            const calc = calculateNetSalary(rawVal);
            input.value = formatNumber(calc.monthlyNet);
        }
    }
    
    updateSimulation();
}

function handleSalaryInput(elem) {
    // Keep cursor position nicely and format with commas
    let val = elem.value.replace(/[^0-9]/g, '');
    if (val === '') {
        elem.value = '';
        return;
    }
    let formatted = formatNumber(parseInt(val, 10));
    elem.value = formatted;
    
    updateSimulation();
}

function adjustSalary(amount) {
    const input = document.getElementById('salary-input');
    let current = parseFormattedNumber(input.value);
    
    current += amount;
    input.value = formatNumber(current);
    
    updateSimulation();
}

function switchYear(year) {
    selectedYear = year;
    window.selectedYear = year;
    
    document.getElementById('btn-yr2026').classList.toggle('active', year === '2026');
    document.getElementById('btn-yr2027').classList.toggle('active', year === '2027');
    document.getElementById('btn-yr2028').classList.toggle('active', year === '2028');
    
    // Update gold-mode styles if 2027/2028 are selected (celebratory projection years)
    const isJackpotYear = (year === '2027' || year === '2028');
    document.getElementById('btn-yr' + year).classList.toggle('gold-mode', isJackpotYear);
    
    // Sparkle effect!
    if (isJackpotYear) {
        triggerConfettiRain();
        setGoldTheme(true);
    } else {
        setGoldTheme(false);
    }
    
    updateSimulation();
}

function setGoldTheme(active) {
    const hynixContainer = document.getElementById('hynix-summary-container');
    const hynixNetLabel = document.getElementById('lbl-hynix-net');
    const hynixSvgBar = document.getElementById('seg-hynix-net');
    const legendColor = document.getElementById('legend-hynix-color');
    
    if (active) {
        if (hynixContainer) {
            hynixContainer.classList.add('gold-mode-card');
            hynixContainer.style.borderLeftColor = 'var(--color-gold)';
        }
        if (hynixNetLabel) hynixNetLabel.className = 'bar-amount-large gold';
        if (hynixSvgBar) hynixSvgBar.classList.add('gold');
        if (legendColor) legendColor.style.backgroundColor = 'var(--color-gold)';
        
        // Icon change
        const iconHynix = document.getElementById('icon-hynix-panel');
        if (iconHynix) {
            iconHynix.className = 'fa-solid fa-crown';
            iconHynix.style.color = 'var(--color-gold)';
        }
        
        // Slider thumbs
        const savingSlider = document.getElementById('saving-ratio-slider');
        if (savingSlider) savingSlider.classList.add('gold');
        
        const btnSp500 = document.getElementById('btn-invest-sp500');
        if (btnSp500) btnSp500.classList.add('gold-mode');
        
        const btnNasdaq = document.getElementById('btn-invest-nasdaq');
        if (btnNasdaq) btnNasdaq.classList.add('gold-mode');
    } else {
        if (hynixContainer) {
            hynixContainer.classList.remove('gold-mode-card');
            hynixContainer.style.borderLeftColor = 'var(--color-hynix-blue)';
        }
        if (hynixNetLabel) hynixNetLabel.className = 'bar-amount-large hynix';
        if (hynixSvgBar) hynixSvgBar.classList.remove('gold');
        if (legendColor) legendColor.style.backgroundColor = 'var(--color-hynix-blue)';
        
        const iconHynix = document.getElementById('icon-hynix-panel');
        if (iconHynix) {
            iconHynix.className = 'fa-solid fa-building-circle-check';
            iconHynix.style.color = 'var(--color-hynix-blue)';
        }
        
        const savingSlider = document.getElementById('saving-ratio-slider');
        if (savingSlider) savingSlider.classList.remove('gold');
        
        const btnSp500 = document.getElementById('btn-invest-sp500');
        if (btnSp500) btnSp500.classList.remove('gold-mode');
        
        const btnNasdaq = document.getElementById('btn-invest-nasdaq');
        if (btnNasdaq) btnNasdaq.classList.remove('gold-mode');
    }
}


function selectPreset(preset) {
    selectedPreset = preset;
    window.selectedPreset = preset;
    
    const presets = ['CL2', 'CL3', 'CL4', 'CL5'];
    presets.forEach(p => {
        document.getElementById('preset-' + p).classList.toggle('active', p === preset);
    });
    
    updateSimulation();
}

function updateSavingRatio(val) {
    savingRatio = parseInt(val, 10);
    window.savingRatio = savingRatio;
    document.getElementById('lbl-saving-ratio').innerText = savingRatio + '%';
    
    updateCumulativeChart();
}

function switchInvestType(type) {
    investmentType = type;
    window.investmentType = type;
    
    const types = ['cash', 'sp500', 'nasdaq'];
    types.forEach(t => {
        document.getElementById('btn-invest-' + t).classList.toggle('active', t === type);
    });
    
    updateCumulativeChart();
}

// --- Main Simulation Core Update ---
function updateSimulation() {
    const input = document.getElementById('salary-input');
    const isHynixOnly = (input === null);
    
    // 2. Get Hynix details
    const hynixData = getHynixSalaryData();
    
    // Update Hynix subtexts in cards
    updateHynixPresetDescriptions();
    
    let userGross = 0;
    let userDetails = calculateNetSalary(0);
    
    if (!isHynixOnly) {
        // 1. Get user salary details
        const rawVal = parseFormattedNumber(input.value);
        if (inputMode === 'pretax') {
            userGross = rawVal;
            userDetails = calculateNetSalary(userGross);
        } else {
            const targetAnnualNet = rawVal * 12;
            userGross = reverseCalculateGross(targetAnnualNet);
            userDetails = calculateNetSalary(userGross);
        }
        
        // 3. Render Large Numbers
        document.getElementById('lbl-user-net').innerText = formatKoreanPrice(userDetails.annualNet) + ' (월 ' + formatKoreanPrice(userDetails.monthlyNet) + ')';
        document.getElementById('lbl-user-gross').innerText = formatKoreanPrice(userGross);
    }
    
    const lblHynixNet = document.getElementById('lbl-hynix-net');
    const lblHynixGross = document.getElementById('lbl-hynix-gross');
    if (lblHynixNet) lblHynixNet.innerText = formatKoreanPrice(hynixData.details.annualNet) + ' (월 ' + formatKoreanPrice(hynixData.details.monthlyNet) + ')';
    if (lblHynixGross) lblHynixGross.innerText = formatKoreanPrice(hynixData.gross);
    
    // 4. Render Bars (percentages of comparison)
    if (!isHynixOnly) {
        const maxNet = Math.max(userDetails.annualNet, hynixData.details.annualNet, 10000000);
        const userPercent = (userDetails.annualNet / maxNet) * 100;
        const hynixPercent = (hynixData.details.annualNet / maxNet) * 100;
        
        document.getElementById('bar-user-fill').style.width = userPercent + '%';
        document.getElementById('bar-hynix-fill').style.width = hynixPercent + '%';
    } else {
        const barHynixFill = document.getElementById('bar-hynix-fill');
        if (barHynixFill) barHynixFill.style.width = '100%';
    }
    
    // 5. Render Segmented SVG Bar Chart
    renderSegmentedChart(userGross, userDetails, hynixData.gross, hynixData.details, isHynixOnly);
    
    // 6. Update Cumulative line chart
    updateCumulativeChart(isHynixOnly);
    
    // 7. Update Witty Cards
    updateWittyCards(userGross, userDetails, hynixData.gross, hynixData.details, isHynixOnly);
    
    // 8. Start/Reset Wage Ticker Timer
    resetWageTicker(hynixData.gross);
    
    // 9. Synchronize current Hynix gross salary with National Growth Fund (NGF) Tab
    if (typeof updateNgfSimulation === 'function') {
        ngfSalary = hynixData.gross; // 파일 내 로컬 변수 동기화!
        window.ngfSalary = hynixData.gross; 
        const lblNgfSalary = document.getElementById('lbl-ngf-salary');
        if (lblNgfSalary && typeof formatKoreanPrice === 'function') {
            lblNgfSalary.innerText = formatKoreanPrice(ngfSalary);
        }
        const lblNgfTargetJob = document.getElementById('lbl-ngf-target-job');
        if (lblNgfTargetJob) {
            lblNgfTargetJob.innerText = selectedPreset + ' (TL) / ' + selectedYear + '년 예상';
        }
        if (typeof updateMiniSwitcherActiveClasses === 'function') {
            updateMiniSwitcherActiveClasses(); // 탭 2 미니 스위처 테두리 불빛 연쇄 업데이트!
        }
        updateNgfSimulation();
    }
}

// Update preset basic salary labels based on selection
function updateHynixPresetDescriptions() {
    const presets = ['CL2', 'CL3', 'CL4', 'CL5'];
    presets.forEach(p => {
        const base = hynixDB.baseSalary[p];
        const fin = hynixDB.financials[selectedYear];
        
        const monthlyBase = base / 20;
        const psRate = (fin.op / 47.2063) * 29.64;
        const piRate = 2.0;
        
        const totalBonus = Math.floor(monthlyBase * (psRate + piRate));
        const gross = base + totalBonus;
        
        document.getElementById('desc-' + p).innerHTML = '기본급: ' + formatKoreanPrice(base) + '<br><b>총액: ' + formatKoreanPrice(gross) + '</b>';
    });
}

// --- Segmented SVG Bar Chart Renderer ---
function renderSegmentedChart(userGross, userDetails, hynixGross, hynixDetails, isHynixOnly) {
    if (isHynixOnly) {
        // Just hide or reset user elements if present, or ignore
        const segUserNet = document.getElementById('seg-user-net');
        const segUserIns = document.getElementById('seg-user-ins');
        const segUserTax = document.getElementById('seg-user-tax');
        if (segUserNet) {
            segUserNet.style.height = '0%';
            segUserIns.style.height = '0%';
            segUserTax.style.height = '0%';
        }
        
        const maxGross = Math.max(hynixGross, 10000000);
        const hynixNetHeight = (hynixDetails.annualNet / maxGross) * 100;
        const hynixInsHeight = (hynixDetails.insurance / maxGross) * 100;
        const hynixTaxHeight = (hynixDetails.tax / maxGross) * 100;
        
        const segHynixNet = document.getElementById('seg-hynix-net');
        const segHynixIns = document.getElementById('seg-hynix-ins');
        const segHynixTax = document.getElementById('seg-hynix-tax');
        if (segHynixNet) {
            segHynixNet.style.height = hynixNetHeight + '%';
            segHynixNet.setAttribute('data-tooltip', '하이닉스 실수령: ' + formatKoreanPrice(hynixDetails.annualNet));
        }
        if (segHynixIns) {
            segHynixIns.style.height = hynixInsHeight + '%';
            segHynixIns.setAttribute('data-tooltip', '하이닉스 4대보험: ' + formatKoreanPrice(hynixDetails.insurance));
        }
        if (segHynixTax) {
            segHynixTax.style.height = hynixTaxHeight + '%';
            segHynixTax.setAttribute('data-tooltip', '하이닉스 소득세: ' + formatKoreanPrice(hynixDetails.tax));
        }
        
        const lblSvgHynixLabel = document.getElementById('lbl-svg-hynix-label');
        if (lblSvgHynixLabel) {
            lblSvgHynixLabel.innerText = selectedPreset + ' (' + selectedYear + '년)';
        }
        return;
    }

    const maxGross = Math.max(userGross, hynixGross, 10000000);
    
    // Calculate heights for elements relative to 100% of the container (180px)
    const userNetHeight = (userDetails.annualNet / maxGross) * 100;
    const userInsHeight = (userDetails.insurance / maxGross) * 100;
    const userTaxHeight = (userDetails.tax / maxGross) * 100;
    
    const hynixNetHeight = (hynixDetails.annualNet / maxGross) * 100;
    const hynixInsHeight = (hynixDetails.insurance / maxGross) * 100;
    const hynixTaxHeight = (hynixDetails.tax / maxGross) * 100;
    
    // Set user segment heights
    const segUserNet = document.getElementById('seg-user-net');
    const segUserIns = document.getElementById('seg-user-ins');
    const segUserTax = document.getElementById('seg-user-tax');
    if (segUserNet) {
        segUserNet.style.height = userNetHeight + '%';
        segUserNet.setAttribute('data-tooltip', '내 실수령액: ' + formatKoreanPrice(userDetails.annualNet));
    }
    if (segUserIns) {
        segUserIns.style.height = userInsHeight + '%';
        segUserIns.setAttribute('data-tooltip', '내 4대보험: ' + formatKoreanPrice(userDetails.insurance));
    }
    if (segUserTax) {
        segUserTax.style.height = userTaxHeight + '%';
        segUserTax.setAttribute('data-tooltip', '내 소득세: ' + formatKoreanPrice(userDetails.tax));
    }
    
    // Set Hynix segment heights
    const segHynixNet = document.getElementById('seg-hynix-net');
    const segHynixIns = document.getElementById('seg-hynix-ins');
    const segHynixTax = document.getElementById('seg-hynix-tax');
    if (segHynixNet) {
        segHynixNet.style.height = hynixNetHeight + '%';
        segHynixNet.setAttribute('data-tooltip', '하이닉스 실수령: ' + formatKoreanPrice(hynixDetails.annualNet));
    }
    if (segHynixIns) {
        segHynixIns.style.height = hynixInsHeight + '%';
        segHynixIns.setAttribute('data-tooltip', '하이닉스 4대보험: ' + formatKoreanPrice(hynixDetails.insurance));
    }
    if (segHynixTax) {
        segHynixTax.style.height = hynixTaxHeight + '%';
        segHynixTax.setAttribute('data-tooltip', '하이닉스 소득세: ' + formatKoreanPrice(hynixDetails.tax));
    }
    
    // Label change based on selected preset
    const lblSvgHynixLabel = document.getElementById('lbl-svg-hynix-label');
    if (lblSvgHynixLabel) {
        lblSvgHynixLabel.innerText = selectedPreset + ' (' + selectedYear + '년)';
    }
}

// --- Cumulative Line Chart Renderer ---
function updateCumulativeChart(isHynixOnly) {
    let userGross = 0;
    let userDetails = calculateNetSalary(0);
    
    if (!isHynixOnly) {
        const input = document.getElementById('salary-input');
        const rawVal = parseFormattedNumber(input.value);
        if (inputMode === 'pretax') {
            userGross = rawVal;
            userDetails = calculateNetSalary(userGross);
        } else {
            const targetAnnualNet = rawVal * 12;
            userGross = reverseCalculateGross(targetAnnualNet);
            userDetails = calculateNetSalary(userGross);
        }
    }
    
    const hynixData = getHynixSalaryData();
    
    const years = 20;
    const userNet = userDetails.annualNet;
    const hynixNet = hynixData.details.annualNet;
    
    // Savings parameters
    const userMonthlySaving = (userNet / 12) * (savingRatio / 100);
    const hynixMonthlySaving = (hynixNet / 12) * (savingRatio / 100);
    
    // Compounding rates (monthly)
    let annualRate = 0;
    if (investmentType === 'sp500') annualRate = 0.08;
    else if (investmentType === 'nasdaq') annualRate = 0.12;
    
    const monthlyRate = annualRate / 12;
    
    let userHistory = [0];
    let hynixHistory = [0];
    
    let currentUserWealth = 0;
    let currentHynixWealth = 0;
    
    for (let yr = 1; yr <= years; yr++) {
        // Calculate wealth month-by-month for compound interest
        for (let m = 0; m < 12; m++) {
            if (annualRate > 0) {
                currentUserWealth = (currentUserWealth + userMonthlySaving) * (1 + monthlyRate);
                currentHynixWealth = (currentHynixWealth + hynixMonthlySaving) * (1 + monthlyRate);
            } else {
                currentUserWealth += userMonthlySaving;
                currentHynixWealth += hynixMonthlySaving;
            }
        }
        userHistory.push(currentUserWealth);
        hynixHistory.push(currentHynixWealth);
    }
    
    // Draw SVG Line chart inside '#line-chart'
    const svg = document.getElementById('line-chart');
    if (!svg) return;
    svg.innerHTML = ''; // clear
    
    const width = svg.clientWidth || 450;
    const height = 280;
    const paddingLeft = 65;
    const paddingBottom = 40;
    const paddingTop = 20;
    const paddingRight = 20;
    
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;
    
    const maxVal = isHynixOnly ? Math.max(hynixHistory[years], 100000000) : Math.max(hynixHistory[years], userHistory[years], 100000000);
    
    // Draw horizontal grid lines
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
        const ratio = i / gridCount;
        const y = height - paddingBottom - (ratio * graphHeight);
        const gridVal = ratio * maxVal;
        
        // Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', paddingLeft);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width - paddingRight);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#f1f5f9');
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
        
        // Text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', paddingLeft - 10);
        text.setAttribute('y', y + 4);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('font-size', '10px');
        text.setAttribute('fill', '#94a3b8');
        text.setAttribute('font-weight', '600');
        text.textContent = formatKoreanPriceCompact(gridVal);
        svg.appendChild(text);
    }
    
    // Draw X-axis labels (0, 5, 10, 15, 20 years)
    const xIntervals = [0, 5, 10, 15, 20];
    xIntervals.forEach(val => {
        const ratio = val / years;
        const x = paddingLeft + (ratio * graphWidth);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', height - paddingBottom + 20);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10px');
        text.setAttribute('fill', '#6b7280');
        text.setAttribute('font-weight', '700');
        text.textContent = val + '년차';
        svg.appendChild(text);
    });
    
    // Helper to map values to coordinates
    const getX = (index) => paddingLeft + ((index / years) * graphWidth);
    const getY = (val) => height - paddingBottom - ((val / maxVal) * graphHeight);
    
    // Draw User Line & Area (Only if NOT in Hynix-Only mode)
    if (!isHynixOnly) {
        let userPoints = '';
        let userAreaPoints = `M ${getX(0)} ${getY(0)}`;
        for (let i = 0; i <= years; i++) {
            const x = getX(i);
            const y = getY(userHistory[i]);
            userPoints += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
            userAreaPoints += ` L ${x} ${y}`;
        }
        userAreaPoints += ` L ${getX(years)} ${getY(0)} Z`;
        
        // User Area Fill
        const userArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        userArea.setAttribute('d', userAreaPoints);
        userArea.setAttribute('fill', 'rgba(16, 185, 129, 0.05)');
        svg.appendChild(userArea);
        
        // User Path Line
        const userLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        userLine.setAttribute('d', userPoints);
        userLine.setAttribute('fill', 'none');
        userLine.setAttribute('stroke', 'var(--color-user)');
        userLine.setAttribute('stroke-width', '3');
        userLine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(userLine);
    }
    
    // Draw Hynix Line & Area
    let hynixPoints = '';
    let hynixAreaPoints = `M ${getX(0)} ${getY(0)}`;
    for (let i = 0; i <= years; i++) {
        const x = getX(i);
        const y = getY(hynixHistory[i]);
        hynixPoints += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        hynixAreaPoints += ` L ${x} ${y}`;
    }
    hynixAreaPoints += ` L ${getX(years)} ${getY(0)} Z`;
    
    const isJackpot = (selectedYear === '2027' || selectedYear === '2028');
    const hynixColor = isJackpot ? 'var(--color-gold)' : 'var(--color-hynix-blue)';
    const hynixRgba = isJackpot ? 'rgba(217, 119, 6, 0.05)' : 'rgba(15, 82, 186, 0.05)';
    
    // Hynix Area Fill
    const hynixArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hynixArea.setAttribute('d', hynixAreaPoints);
    hynixArea.setAttribute('fill', hynixRgba);
    svg.appendChild(hynixArea);
    
    // Hynix Path Line
    const hynixLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hynixLine.setAttribute('d', hynixPoints);
    hynixLine.setAttribute('fill', 'none');
    hynixLine.setAttribute('stroke', hynixColor);
    hynixLine.setAttribute('stroke-width', '3');
    hynixLine.setAttribute('stroke-linecap', 'round');
    svg.appendChild(hynixLine);
    
    // Draw Dot points on Year 10 and Year 20 for highlighting
    const highlightIndices = [10, 20];
    highlightIndices.forEach(idx => {
        // User Dot (Only if NOT in Hynix-Only mode)
        if (!isHynixOnly) {
            const uDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            uDot.setAttribute('cx', getX(idx));
            uDot.setAttribute('cy', getY(userHistory[idx]));
            uDot.setAttribute('r', '5');
            uDot.setAttribute('fill', 'var(--color-user)');
            uDot.setAttribute('stroke', 'white');
            uDot.setAttribute('stroke-width', '2');
            svg.appendChild(uDot);
        }
        
        // Hynix Dot
        const hDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hDot.setAttribute('cx', getX(idx));
        hDot.setAttribute('cy', getY(hynixHistory[idx]));
        hDot.setAttribute('r', '5');
        hDot.setAttribute('fill', hynixColor);
        hDot.setAttribute('stroke', 'white');
        hDot.setAttribute('stroke-width', '2');
        svg.appendChild(hDot);
        
        // Text labels for highlights
        const gapText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        gapText.setAttribute('x', getX(idx));
        gapText.setAttribute('y', getY(hynixHistory[idx]) - 12);
        gapText.setAttribute('text-anchor', 'middle');
        gapText.setAttribute('font-size', '9.5px');
        gapText.setAttribute('fill', isJackpot ? 'var(--color-gold)' : 'var(--color-hynix-blue)');
        gapText.setAttribute('font-weight', '800');
        
        if (isHynixOnly) {
            gapText.textContent = idx + '년 자산: ' + formatKoreanPriceCompact(hynixHistory[idx]);
        } else {
            const gapVal = hynixHistory[idx] - userHistory[idx];
            gapText.textContent = idx + '년 격차: ' + formatKoreanPriceCompact(gapVal);
        }
        svg.appendChild(gapText);
    });
}

// --- Ticking Wage Timer ---
let activeTickerSalary = 0;

function resetWageTicker(annualSalary) {
    // 하이닉스 연봉이 실제로 달라졌을 때만 타이머를 초기화하고 리셋합니다.
    // 그렇지 않고 동일한 연봉에 대해 호출된 경우에는 초기화하지 않고 기존 누적 타이머를 계속 실행합니다.
    if (activeTickerSalary === annualSalary && tickerInterval) {
        return; 
    }
    
    activeTickerSalary = annualSalary;
    if (tickerInterval) clearInterval(tickerInterval);
    
    // 1초당 소득 = 세전 총액 / (365 * 24 * 3600)
    // 100ms당 소득 = 1초 소득 / 10
    const payPerSecond = annualSalary / (365 * 24 * 3600);
    const payPer100ms = payPerSecond / 10;
    
    currentTickerAmount = 0;
    const tickerElem = document.getElementById('val-timer');
    const badge = document.getElementById('badge-ticker');
    
    const isJackpot = (selectedYear === '2027' || selectedYear === '2028');
    
    if (badge) {
        badge.className = isJackpot ? 'ticker-badge gold' : 'ticker-badge';
    }
    if (tickerElem) {
        tickerElem.className = isJackpot ? 'witty-value gold' : 'witty-value';
    }
    
    tickerInterval = setInterval(() => {
        currentTickerAmount += payPer100ms;
        // 소수점 이하 포맷팅 시, 정수부만 콤마를 찍고 소수점은 분리하여 표시 (안전하고 완벽한 포맷팅)
        const parts = currentTickerAmount.toFixed(1).split('.');
        const formattedInt = parseInt(parts[0], 10).toLocaleString('ko-KR');
        if (tickerElem) {
            tickerElem.innerText = formattedInt + '.' + parts[1] + '원';
        }
    }, 100);
}

// --- Witty Micro-Analyses Card Updates ---
function updateWittyCards(userGross, userDetails, hynixGross, hynixDetails, isHynixOnly) {
    const isJackpot = (selectedYear === '2027' || selectedYear === '2028');
    
    // 1. Starbucks Challenge -> Hynix Pride Starbucks Infusion
    const starbucksVal = document.getElementById('val-starbucks');
    const starbucksDesc = document.getElementById('desc-starbucks');
    
    if (isHynixOnly) {
        if (starbucksVal && starbucksDesc) {
            const coffeePrice = 4500;
            const annualNet = hynixDetails.annualNet;
            const coffeeCount = Math.floor(annualNet / coffeePrice);
            starbucksVal.innerText = `연간 약 ${formatNumber(coffeeCount)}잔`;
            starbucksDesc.innerText = `당신의 압도적인 세후 실수령액(${formatKoreanPrice(annualNet)})만으로 매일 스타벅스 아메리카노(4,500원)를 약 ${Math.floor(coffeeCount / 365)}잔씩 아끼지 않고 무제한으로 마실 수 있습니다. 커피값 걱정은 완전히 접어두세요!`;
            starbucksVal.className = isJackpot ? 'witty-value gold' : 'witty-value';
        }
    } else {
        const gap = Math.max(0, hynixDetails.annualNet - userDetails.annualNet);
        const coffeePrice = 4500;
        const coffeePerYear = coffeePrice * 365;
        
        if (starbucksVal && starbucksDesc) {
            if (gap <= 0) {
                starbucksVal.innerText = '비교 완료!';
                starbucksDesc.innerText = '축하합니다! 이미 하이닉스 대조군보다 소득이 높으므로 인내하실 필요가 전혀 없습니다. 커피를 마구 드셔도 됩니다!';
                starbucksVal.className = 'witty-value';
            } else {
                const years = gap / coffeePerYear;
                starbucksVal.innerText = formatYearsKorean(years);
                starbucksDesc.innerText = `매일 스타벅스 아메리카노(4,500원)를 한 잔도 안 마시고 저축해서, 하이닉스 대조군 직원과의 1년 세후 소득 차이(${formatKoreanPrice(gap)})를 메우려면 걸리는 시간입니다.`;
                starbucksVal.className = isJackpot ? 'witty-value gold' : 'witty-value';
            }
        }
    }
    
    // 2. Breathing Sudden Wealth Chase -> Hynix Wealth Acceleration Card
    const breathingVal = document.getElementById('val-breathing');
    const breathingDesc = document.getElementById('desc-breathing');
    
    if (isHynixOnly) {
        if (breathingVal && breathingDesc) {
            const compoundInterest10Yr = hynixDetails.annualNet * 10 * 1.5; // rough estimate
            breathingVal.innerText = '자산 가속 ' + (savingRatio >= 50 ? '특급' : '우수');
            breathingDesc.innerText = `선택하신 직급에서 ${savingRatio}%의 저축률로 S&P 500 또는 NASDAQ 복리 투자 시, 10년 뒤 원리금 포함 약 ${formatKoreanPrice(compoundInterest10Yr)}의 대규모 자산을 축적하며 특급 성장 가도에 도달합니다!`;
            breathingVal.className = isJackpot ? 'witty-value gold' : 'witty-value';
        }
    } else {
        if (breathingVal && breathingDesc) {
            if (userDetails.annualNet <= 0) {
                breathingVal.innerText = '추적 불가능';
                breathingDesc.innerText = '연 소득을 입력해 주셔야 저축을 통한 추적이 시작됩니다.';
                breathingVal.className = 'witty-value';
            } else {
                const yearsNeeded = hynixDetails.annualNet / userDetails.annualNet;
                breathingVal.innerText = formatYearsKorean(yearsNeeded);
                breathingDesc.innerText = `당신이 오늘부터 10원도 쓰지 않고(숨만 쉬며 연 소득 100% 저축) 모아야 하이닉스 대조군의 '단 1년 세후 실수령액'인 ${formatKoreanPrice(hynixDetails.annualNet)}을 따라잡을 수 있습니다.`;
                breathingVal.className = isJackpot ? 'witty-value gold' : 'witty-value';
            }
        }
    }
    
    // 3. Tax Patriotic Contributor scale (Click-to-Cycle)
    const taxVal = document.getElementById('val-tax');
    const taxDesc = document.getElementById('desc-tax');
    const taxIcon = document.getElementById('icon-tax');
    
    const hynixTax = hynixDetails.tax;
    const patriotItem = taxPatriotList[taxPatriotIndex];
    const count = Math.floor(hynixTax / patriotItem.cost);
    
    if (taxIcon) taxIcon.innerText = patriotItem.icon;
    if (taxVal) {
        taxVal.innerText = `${patriotItem.name} ${formatNumber(count)}${patriotItem.unit}`;
        taxVal.className = isJackpot ? 'witty-value gold' : 'witty-value';
    }
    if (taxDesc) {
        taxDesc.innerHTML = patriotItem.desc(hynixTax, count);
    }
}

// --- Confetti particle engine on canvas ---
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
let particles = [];
let animationFrameId = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function triggerConfettiRain() {
    // Clear any previous loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    particles = [];
    const colors = ['#ff5e00', '#0f52ba', '#fbbf24', '#d97706', '#10b981', '#ffffff'];
    
    // Generate 120 confetti pieces
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height - 20,
            size: Math.random() * 8 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 4 + 3,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 4 - 2
        });
    }
    
    let timer = 0;
    
    function updateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let alive = false;
        
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            
            if (p.y < canvas.height) {
                alive = true;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                
                // Draw square confetti
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
        });
        
        timer++;
        
        // Stop animating after 3.5 seconds
        if (alive && timer < 220) {
            animationFrameId = requestAnimationFrame(updateConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    updateConfetti();
}

// --- Formatting Helpers ---
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseFormattedNumber(str) {
    const parsed = parseInt(str.replace(/,/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
}

function formatKoreanPrice(num) {
    if (num <= 0) return '0원';
    
    const eok = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    
    let result = '';
    if (eok > 0) {
        result += eok + '억 ';
    }
    if (man > 0) {
        result += man + '만';
    }
    return result.trim() + '원';
}

function formatKoreanPriceCompact(num) {
    if (num <= 0) return '0원';
    
    const eok = num / 100000000;
    if (eok >= 1) {
        return eok.toFixed(1).replace(/\.0$/, '') + '억원';
    }
    
    const man = num / 10000;
    return man.toFixed(0) + '만원';
}

function formatYearsKorean(totalYears) {
    const y = Math.floor(totalYears);
    const m = Math.floor((totalYears - y) * 12);
    
    let str = '';
    if (y > 0) str += y + '년';
    if (m > 0) str += ' ' + m + '개월';
    
    if (str === '') return '1개월 미만';
    return str;
}

// --- Tab Switching Logic (Combined in app.js) ---
function switchMainTab(tab) {
    const btnSalary = document.getElementById('main-tab-salary');
    const btnNgf = document.getElementById('main-tab-ngf');
    const btnClock = document.getElementById('main-tab-clock');
    
    const panelSalary = document.getElementById('content-salary');
    const panelNgf = document.getElementById('content-ngf');
    const panelClock = document.getElementById('content-clock');
    
    if (!btnSalary || !btnNgf || !btnClock || !panelSalary || !panelNgf || !panelClock) return;
    
    // 1. Remove active states from buttons
    btnSalary.classList.remove('active');
    btnNgf.classList.remove('active');
    btnClock.classList.remove('active');
    
    // 2. Add active to current tab button
    if (tab === 'salary') btnSalary.classList.add('active');
    if (tab === 'ngf') btnNgf.classList.add('active');
    if (tab === 'clock') btnClock.classList.add('active');
    
    // 3. Turn off any running animations/timers
    stopWageClock();
    
    // 4. Hide all content panels first
    panelSalary.classList.remove('active');
    panelNgf.classList.remove('active');
    panelClock.classList.remove('active');
    
    setTimeout(() => {
        panelSalary.style.display = 'none';
        panelNgf.style.display = 'none';
        panelClock.style.display = 'none';
        
        // 5. Show and activate targeted panel
        let targetPanel = null;
        if (tab === 'salary') targetPanel = panelSalary;
        if (tab === 'ngf') targetPanel = panelNgf;
        if (tab === 'clock') targetPanel = panelClock;
        
        if (targetPanel) {
            targetPanel.style.display = 'block';
            setTimeout(() => {
                targetPanel.classList.add('active');
                
                // 6. Post-tab load actions
                if (tab === 'salary') {
                    updateSimulation();
                } else if (tab === 'ngf') {
                    const hynixData = getHynixSalaryData();
                    ngfSalary = hynixData.gross;
                    updateMiniSwitcherActiveClasses();
                    updateNgfSimulation();
                } else if (tab === 'clock') {
                    startWageClock();
                    if (clockMode === 'hourglass') {
                        initHourglassCanvas();
                    }
                }
            }, 50);
        }
    }, 150); // Consistent fast transition delay (150ms)
}

// --- Tab 2 built-in mini switches ---
function selectNgfPreset(preset) {
    selectPreset(preset); // sync to Tab 1 preset
    const hynixData = getHynixSalaryData();
    ngfSalary = hynixData.gross;
    updateMiniSwitcherActiveClasses();
    updateNgfSimulation();
}

function selectNgfYear(year) {
    switchYear(year); // sync to Tab 1 year
    const hynixData = getHynixSalaryData();
    ngfSalary = hynixData.gross;
    updateMiniSwitcherActiveClasses();
    updateNgfSimulation();
}

function updateMiniSwitcherActiveClasses() {
    // 1. Grade mini active
    const presets = ['CL2', 'CL3', 'CL4', 'CL5'];
    presets.forEach(p => {
        const btn = document.getElementById('ngf-mini-' + p);
        if (btn) {
            btn.classList.toggle('active', p === selectedPreset);
        }
    });
    
    // 2. Year mini active
    const years = ['2026', '2027', '2028'];
    const isJackpotYear = (selectedYear === '2027' || selectedYear === '2028');
    years.forEach(y => {
        const btn = document.getElementById('ngf-mini-' + y);
        if (btn) {
            btn.className = 'mini-switch-btn'; // reset
            if (y === selectedYear) {
                if (isJackpotYear) {
                    btn.classList.add('gold-active');
                } else {
                    btn.classList.add('active');
                }
            }
        }
    });
}

// --- Sub Tab Switcher (Simple vs Detailed) inside Receipt ---
function switchNgfResultTab(mode) {
    ngfResultTabMode = mode;
    
    const btnSimple = document.getElementById('ngf-sub-simple');
    const btnDetailed = document.getElementById('ngf-sub-detailed');
    const contentSimple = document.getElementById('receipt-content-simple');
    const contentDetailed = document.getElementById('receipt-content-detailed');
    
    if (!btnSimple || !btnDetailed || !contentSimple || !contentDetailed) return;
    
    if (mode === 'simple') {
        btnSimple.classList.add('active');
        btnDetailed.classList.remove('active');
        
        contentDetailed.classList.remove('active');
        setTimeout(() => {
            contentDetailed.style.display = 'none';
            contentSimple.style.display = 'block';
            setTimeout(() => {
                contentSimple.classList.add('active');
            }, 50);
        }, 150);
    } else {
        btnDetailed.classList.add('active');
        btnSimple.classList.remove('active');
        
        contentSimple.classList.remove('active');
        setTimeout(() => {
            contentSimple.style.display = 'none';
            contentDetailed.style.display = 'block';
            setTimeout(() => {
                contentDetailed.classList.add('active');
            }, 50);
        }, 150);
    }
    
    updateNgfSimulation();
}

// --- Tab 2 Sliders and Plan Presets ---
function handleNgfInvestmentSlider(value) {
    ngfAnnualInvestment = parseInt(value, 10);
    
    const lblCapWarning = document.getElementById('lbl-ngf-cap-warning');
    if (lblCapWarning) {
        lblCapWarning.style.display = ngfAnnualInvestment > 40000000 ? 'block' : 'none';
    }
    
    const lblInvestment = document.getElementById('lbl-ngf-investment');
    if (lblInvestment) {
        lblInvestment.innerText = formatKoreanPrice(ngfAnnualInvestment) + ' (월 ' + formatKoreanPrice(Math.floor(ngfAnnualInvestment / 12)) + ')';
    }
    
    // Sync active plan buttons based on value (handles both index.html and hynix.html buttons)
    const btnBalance = document.getElementById('ngf-plan-balance');
    const btnMaxRefund = document.getElementById('ngf-plan-maxrefund');
    const btnShield = document.getElementById('ngf-plan-shield');
    const btnTax = document.getElementById('ngf-plan-tax');
    const btnSuper = document.getElementById('ngf-plan-super');
    
    if (btnBalance) btnBalance.classList.toggle('active', ngfAnnualInvestment === 40000000);
    if (btnMaxRefund) btnMaxRefund.classList.toggle('active', ngfAnnualInvestment === 70000000);
    if (btnShield) btnShield.classList.toggle('active', ngfAnnualInvestment === 100000000);
    if (btnTax) btnTax.classList.toggle('active', ngfAnnualInvestment === 30000000);
    if (btnSuper) btnSuper.classList.toggle('active', ngfAnnualInvestment === 60000000);
    
    updateNgfSimulation();
}

function selectNgfPlan(plan) {
    if (plan === 'balance') {
        ngfAnnualInvestment = 40000000;
    } else if (plan === 'maxrefund') {
        ngfAnnualInvestment = 70000000;
    } else if (plan === 'shield') {
        ngfAnnualInvestment = 100000000;
    } else if (plan === 'tax') {
        ngfAnnualInvestment = 30000000;
    } else if (plan === 'super') {
        ngfAnnualInvestment = 60000000;
    }
    
    const slider = document.getElementById('ngf-investment-slider');
    if (slider) {
        slider.value = ngfAnnualInvestment;
    }
    
    handleNgfInvestmentSlider(ngfAnnualInvestment);
}

function handleNgfReturnSlider(value) {
    ngfExpectedReturn = parseInt(value, 10);
    const lblReturn = document.getElementById('lbl-ngf-return');
    if (lblReturn) {
        lblReturn.innerText = (ngfExpectedReturn >= 0 ? '+' : '') + ngfExpectedReturn + '%';
    }
    updateNgfSimulation();
}

function handleGenReturnSlider(value) {
    genExpectedReturn = parseInt(value, 10);
    const lblGenReturn = document.getElementById('lbl-gen-return');
    if (lblGenReturn) {
        lblGenReturn.innerText = (genExpectedReturn >= 0 ? '+' : '') + genExpectedReturn + '%';
    }
    updateNgfSimulation();
}

function handleNgfTaxToggle(checked) {
    ngfTaxShieldActive = checked;
    updateNgfSimulation();
}

function toggleAuditConsole() {
    auditConsoleExpanded = !auditConsoleExpanded;
    const panel = document.getElementById('audit-expanded-panel');
    const arrow = document.getElementById('audit-arrow');
    
    if (panel && arrow) {
        if (auditConsoleExpanded) {
            panel.style.display = 'block';
            arrow.style.transform = 'rotate(180deg)';
        } else {
            panel.style.display = 'none';
            arrow.style.transform = 'rotate(0deg)';
        }
    }
}

// --- National Growth Fund Calculations and UI Rendering ---
function calculateNgfDeduction(annualInvestment) {
    let deduction = 0;
    const bracket1 = Math.min(annualInvestment, 30000000);
    deduction += bracket1 * 0.40;
    
    if (annualInvestment > 30000000) {
        const bracket2 = Math.min(annualInvestment - 30000000, 20000000);
        deduction += bracket2 * 0.20;
    }
    if (annualInvestment > 50000000) {
        const bracket3 = Math.min(annualInvestment - 50000000, 20000000);
        deduction += bracket3 * 0.10;
    }
    return deduction;
}

function getMarginalTaxRate(salary) {
    const calc = calculateNetSalary(salary);
    const insurances = calc.insurance;
    const taxBase = salary - insurances - 1500000;
    
    let marginalTaxRate = 0.06;
    if (taxBase <= 14000000) marginalTaxRate = 0.06;
    else if (taxBase <= 50000000) marginalTaxRate = 0.15;
    else if (taxBase <= 88000000) marginalTaxRate = 0.24;
    else if (taxBase <= 150000000) marginalTaxRate = 0.35;
    else if (taxBase <= 300000000) marginalTaxRate = 0.38;
    else if (taxBase <= 500000000) marginalTaxRate = 0.40;
    else marginalTaxRate = 0.42;
    
    return marginalTaxRate * 1.1; // include local tax 10%
}

function getNgfActualReturnRate(nominalReturn) {
    if (nominalReturn >= 0) return nominalReturn;
    const loss = Math.abs(nominalReturn);
    const actualLoss = Math.max(0, loss - 20); // 20% first loss protection
    return -actualLoss;
}

function updateNgfSimulation() {
    const lblCagr = document.getElementById('lbl-ngf-cagr-equivalent');
    if (!lblCagr) return; // Tab 2 not fully rendered or active yet
    
    // 1. Calculate 5-year investment plan capped at 200,000,000 KRW
    let investmentPlan = [0, 0, 0, 0, 0];
    let totalInvested = 0;
    const limit5Yr = 200000000;
    for (let yr = 0; yr < 5; yr++) {
        const remainingCap = Math.max(0, limit5Yr - totalInvested);
        const currentYrInvest = Math.min(ngfAnnualInvestment, remainingCap);
        investmentPlan[yr] = currentYrInvest;
        totalInvested += currentYrInvest;
    }
    
    // 2. Tax Refunds
    const marginalRate = getMarginalTaxRate(ngfSalary);
    let totalRefunds = 0;
    for (let yr = 0; yr < 5; yr++) {
        const deduction = calculateNgfDeduction(investmentPlan[yr]);
        totalRefunds += deduction * marginalRate;
    }
    
    // 3. Dividend Tax Savings
    const annualDividendRate = 0.05; // 5% average dividend assumption
    let totalTaxSavings = 0;
    let cumulativeInvested = 0;
    for (let yr = 0; yr < 5; yr++) {
        cumulativeInvested += investmentPlan[yr];
        const dividend = cumulativeInvested * annualDividendRate;
        let comparisonRate = 0.154; // General tax rate (15.4%)
        if (ngfTaxShieldActive) {
            comparisonRate = marginalRate; // High comprehensive tax rate
        }
        const savings = Math.max(0, dividend * (comparisonRate - 0.099)); // NGF uses 9.9%
        totalTaxSavings += savings;
    }
    
    // 4. Fund Maturity Return
    const actualReturnRate = getNgfActualReturnRate(ngfExpectedReturn) / 100;
    const totalProfitNominal = totalInvested * actualReturnRate;
    let netCapitalGain = 0;
    if (totalProfitNominal > 0) {
        netCapitalGain = totalProfitNominal * (1 - 0.099); // 9.9% low tax
    } else {
        netCapitalGain = totalProfitNominal; // protected loss
    }
    
    const finalMaturityValue = totalInvested + netCapitalGain;
    const totalBenefitValue = finalMaturityValue + totalRefunds + totalTaxSavings;
    const totalProfitRealized = totalBenefitValue - totalInvested;
    
    // 5. Equivalent Savings Rate
    const monthlyContribution = totalInvested / 60;
    let equivalentSavingsRate = 0;
    if (totalProfitRealized > 0 && monthlyContribution > 0) {
        equivalentSavingsRate = (totalProfitRealized / (monthlyContribution * 152.5 * 0.846)) * 100;
    }
    
    // 6. General Investment Breakeven Return
    let normalTaxRate = ngfTaxShieldActive ? marginalRate : 0.154;
    let breakevenGenReturn = 0;
    if (totalBenefitValue >= totalInvested) {
        breakevenGenReturn = ((totalBenefitValue - totalInvested) / (totalInvested * (1 - normalTaxRate))) * 100;
    } else {
        breakevenGenReturn = ((totalBenefitValue - totalInvested) / totalInvested) * 100;
    }
    
    // --- Render Outputs to DOM ---
    
    // Sub Content 1: Simple
    document.getElementById('lbl-rec-simple-principal').innerText = formatKoreanPrice(totalInvested);
    document.getElementById('lbl-rec-simple-taxsave').innerText = '+' + formatKoreanPrice(Math.floor(totalRefunds + totalTaxSavings));
    document.getElementById('lbl-rec-simple-fundgain').innerText = (netCapitalGain >= 0 ? '+' : '') + formatKoreanPrice(Math.floor(netCapitalGain));
    document.getElementById('lbl-rec-simple-total').innerText = formatKoreanPrice(Math.floor(totalBenefitValue));
    
    // Sub Content 2: Detailed
    document.getElementById('lbl-rec-principal').innerText = formatKoreanPrice(totalInvested);
    document.getElementById('lbl-rec-refund').innerText = '+' + formatKoreanPrice(Math.floor(totalRefunds));
    document.getElementById('lbl-rec-return').innerText = (netCapitalGain >= 0 ? '+' : '') + formatKoreanPrice(Math.floor(netCapitalGain));
    document.getElementById('lbl-rec-total').innerText = formatKoreanPrice(Math.floor(totalBenefitValue));
    const lblRecShield = document.getElementById('lbl-rec-shield');
    if (lblRecShield) lblRecShield.innerText = '+' + formatKoreanPrice(Math.floor(totalTaxSavings));
    
    // Main CAGR Badge
    if (equivalentSavingsRate > 0) {
        lblCagr.innerText = '연 ' + equivalentSavingsRate.toFixed(1) + '% 적금 효과!';
        lblCagr.style.color = 'var(--color-user)';
    } else {
        const realizedCagrPercent = (Math.pow(Math.max(0.1, totalBenefitValue) / totalInvested, 0.2) - 1) * 100;
        lblCagr.innerText = '실질 복리 연 ' + realizedCagrPercent.toFixed(1) + '%';
        lblCagr.style.color = realizedCagrPercent < 0 ? '#ef4444' : 'var(--text-secondary)';
    }
    
    // Breakeven text
    const lblBreakevenNgfRate = document.getElementById('lbl-ngf-breakeven-ngf-rate');
    const lblBreakevenRate = document.getElementById('lbl-ngf-breakeven-rate');
    const lblBreakevenText = document.getElementById('lbl-ngf-breakeven-text');
    if (lblBreakevenNgfRate) lblBreakevenNgfRate.innerText = (ngfExpectedReturn >= 0 ? '+' : '') + ngfExpectedReturn.toFixed(1) + '%';
    if (lblBreakevenRate) lblBreakevenRate.innerText = '세전 ' + (breakevenGenReturn >= 0 ? '+' : '') + breakevenGenReturn.toFixed(1) + '%';
    if (lblBreakevenText) {
        if (breakevenGenReturn >= 0) {
            lblBreakevenText.innerHTML = `국민성장펀드가 <strong style="color: var(--color-hynix-blue); font-weight: 800;">${ngfExpectedReturn >= 0 ? '+' : ''}${ngfExpectedReturn.toFixed(1)}%</strong> 수익률일 때, 일반 ETF는 <strong style="color: var(--color-gold); font-weight: 900; font-size: 0.95rem;">세전 +${breakevenGenReturn.toFixed(1)}%</strong> 이상의 높은 수익을 내야만 세후 실수령액이 같아집니다!`;
        } else {
            lblBreakevenText.innerHTML = `국민성장펀드가 <strong style="color: var(--color-hynix-blue); font-weight: 800;">${ngfExpectedReturn.toFixed(1)}%</strong> 수준의 원금 손실을 기록하더라도, 정부 손실보전 및 소득공제 환급금 효과 덕분에 일반 ETF는 <strong style="color: #ef4444; font-weight: 900; font-size: 0.95rem;">세전 ${breakevenGenReturn.toFixed(1)}%</strong>를 넘겨야 겨우 세후 실수령을 맞출 수 있습니다!`;
        }
    }
    
    // --- Render Bars Graphics ---
    const genProfitNominal = totalInvested * (genExpectedReturn / 100);
    let netNormalGain = genProfitNominal > 0 ? genProfitNominal * (1 - normalTaxRate) : genProfitNominal;
    const normalValueNet = totalInvested + netNormalGain;
    const protectedValueNet = totalInvested + netCapitalGain;
    
    const barNormalLoss = document.getElementById('bar-normal-loss');
    const barNormalGain = document.getElementById('bar-normal-gain');
    const barNgfGain = document.getElementById('bar-ngf-gain');
    const shieldStatus = document.getElementById('lbl-shield-status');
    const shieldOverlay = document.getElementById('ngf-shield-overlay');
    const barNgfShieldGlow = document.getElementById('bar-ngf-shield-glow');
    
    if (barNormalLoss && barNormalGain && barNgfGain) {
        if (genExpectedReturn < 0) {
            const lossPercent = Math.min(100, Math.abs(genExpectedReturn));
            barNormalGain.style.height = (100 - lossPercent) + '%';
            barNormalLoss.style.height = lossPercent + '%';
        } else {
            barNormalGain.style.height = '100%';
            barNormalLoss.style.height = '0%';
        }
        
        if (ngfExpectedReturn < 0) {
            const actualLossCapped = getNgfActualReturnRate(ngfExpectedReturn);
            const lossPercent = Math.min(100, Math.abs(actualLossCapped));
            barNgfGain.style.height = (100 - lossPercent) + '%';
        } else {
            barNgfGain.style.height = '100%';
        }
    }
    
    if (shieldStatus && shieldOverlay && barNgfShieldGlow) {
        if (ngfExpectedReturn < 0) {
            shieldStatus.className = 'shield-badge active';
            shieldStatus.innerHTML = '<i class="fa-solid fa-shield-halved"></i> 20% 손실 방패 가동!';
            shieldStatus.style.color = 'var(--color-user)';
            shieldStatus.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
            
            shieldOverlay.style.display = 'flex';
            barNgfShieldGlow.style.display = 'block';
        } else {
            shieldStatus.className = 'shield-badge inactive';
            shieldStatus.innerHTML = '<i class="fa-solid fa-shield-halved"></i> 보호막 대기중';
            shieldStatus.style.color = '#475569';
            shieldStatus.style.backgroundColor = '#cbd5e1';
            
            shieldOverlay.style.display = 'none';
            barNgfShieldGlow.style.display = 'none';
        }
    }
    
    const lblBarNormalVal = document.getElementById('lbl-bar-normal-val');
    const lblBarNgfVal = document.getElementById('lbl-bar-ngf-val');
    if (lblBarNormalVal) {
        lblBarNormalVal.innerText = formatKoreanPriceCompact(normalValueNet);
        lblBarNormalVal.style.color = genExpectedReturn < 0 ? '#ef4444' : 'var(--text-secondary)';
    }
    if (lblBarNgfVal) {
        lblBarNgfVal.innerText = formatKoreanPriceCompact(protectedValueNet);
        if (ngfExpectedReturn < 0 && ngfExpectedReturn >= -20) {
            lblBarNgfVal.innerText = formatKoreanPriceCompact(protectedValueNet) + ' (원금보호)';
            lblBarNgfVal.style.color = 'var(--color-user)';
        } else if (ngfExpectedReturn < -20) {
            lblBarNgfVal.style.color = '#ef4444';
        } else {
            lblBarNgfVal.style.color = protectedValueNet > normalValueNet ? 'var(--color-user)' : 'var(--color-hynix-blue)';
        }
    }
    
    // --- Render Audit Console Step Values ---
    updateAuditConsoleValuesConsolidated(totalInvested, totalRefunds, totalTaxSavings, netCapitalGain, breakevenGenReturn, marginalRate, normalTaxRate);
}

function updateAuditConsoleValuesConsolidated(totalInvested, totalRefunds, totalTaxSavings, netCapitalGain, breakevenGenReturn, marginalRate, normalTaxRate) {
    const elSalary = document.getElementById('audit-val-salary');
    const elRefund = document.getElementById('audit-val-refund');
    const elTaxShield = document.getElementById('audit-val-taxshield');
    const elBreakeven = document.getElementById('audit-val-breakeven');
    
    const elStep1Gross = document.getElementById('audit-step1-gross');
    const elStep1Insurances = document.getElementById('audit-step1-insurances');
    const elStep1Taxbase = document.getElementById('audit-step1-taxbase');
    const elStep1Rate = document.getElementById('audit-step1-rate');
    
    const elStep2Principal = document.getElementById('audit-step2-principal');
    const elStep2Deduction = document.getElementById('audit-step2-deduction');
    const elStep2Ruraltax = document.getElementById('audit-step2-ruraltax');
    
    const elStep3Dividend = document.getElementById('audit-step3-dividend');
    const elStep3Genrate = document.getElementById('audit-step3-genrate');
    const elStep3Savings = document.getElementById('audit-step3-savings');
    
    const calc = calculateNetSalary(ngfSalary);
    const insurances = calc.insurance;
    const taxBase = Math.max(0, ngfSalary - insurances - 1500000);
    
    if (elSalary) elSalary.innerText = formatKoreanPrice(ngfSalary);
    if (elStep1Gross) elStep1Gross.innerText = formatKoreanPrice(ngfSalary);
    if (elStep1Insurances) elStep1Insurances.innerText = '-' + formatKoreanPrice(Math.floor(insurances));
    if (elStep1Taxbase) elStep1Taxbase.innerText = formatKoreanPrice(Math.floor(taxBase));
    if (elStep1Rate) elStep1Rate.innerText = (marginalRate * 100).toFixed(1) + '% (지방세 포함)';
    
    let totalDeductions = 0;
    let cumulativeInvested = 0;
    const limit5Yr = 200000000;
    for (let yr = 0; yr < 5; yr++) {
        const remainingCap = Math.max(0, limit5Yr - cumulativeInvested);
        const currentYrInvest = Math.min(ngfAnnualInvestment, remainingCap);
        totalDeductions += calculateNgfDeduction(currentYrInvest);
        cumulativeInvested += currentYrInvest;
    }
    const ruralTaxSavings = totalRefunds * 0.20;
    
    if (elRefund) elRefund.innerText = '+' + formatKoreanPrice(Math.floor(totalRefunds));
    if (elStep2Principal) elStep2Principal.innerText = formatKoreanPrice(totalInvested);
    if (elStep2Deduction) elStep2Deduction.innerText = formatKoreanPrice(Math.floor(totalDeductions));
    if (elStep2Ruraltax) elStep2Ruraltax.innerText = formatKoreanPrice(Math.floor(ruralTaxSavings)) + ' 절감 완료!';
    
    const annualDividendRate = 0.05;
    let totalDividends = 0;
    let tempCumulative = 0;
    for (let yr = 0; yr < 5; yr++) {
        const remainingCap = Math.max(0, limit5Yr - tempCumulative);
        const currentYrInvest = Math.min(ngfAnnualInvestment, remainingCap);
        tempCumulative += currentYrInvest;
        totalDividends += tempCumulative * annualDividendRate;
    }
    
    if (elTaxShield) elTaxShield.innerText = '+' + formatKoreanPrice(Math.floor(totalTaxSavings));
    if (elStep3Dividend) elStep3Dividend.innerText = formatKoreanPrice(Math.floor(totalDividends));
    if (elStep3Genrate) elStep3Genrate.innerText = (normalTaxRate * 100).toFixed(1) + '%';
    if (elStep3Savings) elStep3Savings.innerText = '+' + formatKoreanPrice(Math.floor(totalTaxSavings));
    if (elBreakeven) elBreakeven.innerText = '세전 ' + (breakevenGenReturn >= 0 ? '+' : '') + breakevenGenReturn.toFixed(1) + '%';
}

// --- Dynamic html2canvas screenshot download ---
function downloadReceiptImage() {
    const receiptElement = document.querySelector('.receipt-card');
    const downloadBtn = document.querySelector('.receipt-download-btn');
    const subTabSwitcher = document.querySelector('.receipt-card .sub-tab-switcher');
    
    if (!receiptElement) return;
    
    const captureReceipt = () => {
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (subTabSwitcher) subTabSwitcher.style.visibility = 'hidden';
        
        const originalBorder = receiptElement.style.border;
        const originalShadow = receiptElement.style.boxShadow;
        receiptElement.style.border = 'none';
        receiptElement.style.boxShadow = 'none';
        
        window.html2canvas(receiptElement, {
            backgroundColor: '#ffffff',
            scale: 2.5,
            useCORS: true,
            logging: false
        }).then(canvas => {
            if (downloadBtn) downloadBtn.style.display = 'flex';
            if (subTabSwitcher) subTabSwitcher.style.visibility = 'visible';
            receiptElement.style.border = originalBorder;
            receiptElement.style.boxShadow = originalShadow;
            
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `국민성장펀드_절세_영수증_${window.selectedPreset}_${window.selectedYear}.png`;
            link.href = imgData;
            link.click();
            
            showPremiumNotification('📥 절세 영수증이 고화질 이미지(PNG)로 저장되었습니다!');
            if (typeof triggerConfettiRain === 'function') {
                triggerConfettiRain();
            }
        }).catch(err => {
            console.error('Error rendering receipt image:', err);
            if (downloadBtn) downloadBtn.style.display = 'flex';
            if (subTabSwitcher) subTabSwitcher.style.visibility = 'visible';
            receiptElement.style.border = originalBorder;
            receiptElement.style.boxShadow = originalShadow;
            showPremiumNotification('❌ 영수증 이미지 저장에 실패했습니다. 다시 시도해 주세요.');
        });
    };
    
    if (typeof window.html2canvas === 'function') {
        captureReceipt();
    } else {
        showPremiumNotification('⏳ 이미지 렌더링 라이브러리(html2canvas)를 동적 로드 중입니다...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => { captureReceipt(); };
        script.onerror = () => { showPremiumNotification('❌ 네트워크 오프라인 상태여서 저장 기능을 사용할 수 없습니다.'); };
        document.head.appendChild(script);
    }
}

// Premium visual notification toast
function showPremiumNotification(message) {
    let container = document.getElementById('premium-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'premium-toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '24px';
        container.style.right = '24px';
        container.style.zIndex = '99999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = 'rgba(15, 82, 186, 0.95)';
    toast.style.backdropFilter = 'blur(8px)';
    toast.style.color = '#ffffff';
    toast.style.fontFamily = "var(--font-heading)";
    toast.style.fontSize = '0.85rem';
    toast.style.fontWeight = '700';
    toast.style.padding = '14px 24px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 25px rgba(15, 82, 186, 0.3)';
    toast.style.border = '1px solid rgba(255,255,255,0.15)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.animation = 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-user); font-size: 1.1rem;"></i> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3500);
}

// --- Patriotic Tax Card click-to-cycle function ---
function cycleTaxPatriotExample() {
    const card = document.getElementById('card-tax');
    if (!card) return;
    
    // Premium soft scale and fade transition
    card.style.opacity = '0.3';
    card.style.transform = 'scale(0.97)';
    
    setTimeout(() => {
        taxPatriotIndex = (taxPatriotIndex + 1) % taxPatriotList.length;
        
        // Re-trigger simulation updates to update card values!
        updateSimulation();
        
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    }, 150);
}

// --- Hynix Wage Ticker Clock Functions ---
let clockTimeReference = 'year'; // Default 'year' or 'today'
let settledSurfaceCoins = []; // List to hold recently settled coins for visual texture

function switchClockMode(mode) {
    clockMode = mode;
    
    const modes = ['odometer', 'hourglass', 'matcher'];
    modes.forEach(m => {
        const btn = document.getElementById('clock-mode-' + m);
        const panel = document.getElementById('clock-panel-' + m);
        if (btn) btn.classList.toggle('active', m === mode);
        if (panel) panel.classList.toggle('active', m === mode);
    });
    
    if (mode === 'hourglass') {
        initHourglassCanvas();
    } else {
        if (hourglassAnimFrame) {
            cancelAnimationFrame(hourglassAnimFrame);
            hourglassAnimFrame = null;
        }
    }
}

function switchClockRef(ref) {
    clockTimeReference = ref;
    
    const btnYear = document.getElementById('clock-ref-year');
    const btnToday = document.getElementById('clock-ref-today');
    if (btnYear && btnToday) {
        btnYear.classList.toggle('active', ref === 'year');
        btnToday.classList.toggle('active', ref === 'today');
    }
    
    hourglassCoins = [];
    settledSurfaceCoins = [];
    
    startWageClock();
}

function startWageClock() {
    if (clockInterval) clearInterval(clockInterval);
    
    const odometerText = document.getElementById('live-odometer-text');
    const clockAnnualSalary = document.getElementById('clock-lbl-annual-salary');
    const clockPayPerSecond = document.getElementById('clock-lbl-pay-per-second');
    
    let lastSpawnedAmount = 0;
    
    clockInterval = setInterval(() => {
        const hynixData = getHynixSalaryData();
        const annualSalary = hynixData.gross;
        
        // 1년 총 ms = 365 * 24 * 3600 * 1000 = 31,536,000,000
        const payPerMs = annualSalary / 31536000000;
        
        const now = Date.now();
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).getTime();
        
        let elapsedMs = 0;
        if (clockTimeReference === 'year') {
            elapsedMs = now - startOfYear;
        } else {
            elapsedMs = now - startOfToday;
        }
        
        clockCumulativeEarnings = elapsedMs * payPerMs;
        
        // Update static info labels
        if (clockAnnualSalary) {
            clockAnnualSalary.innerText = formatKoreanPrice(annualSalary);
        }
        if (clockPayPerSecond) {
            const paySec = annualSalary / (365 * 24 * 3600);
            clockPayPerSecond.innerText = paySec.toFixed(2) + '원';
        }
        
        // Mode 1: Golden Odometer
        if (clockMode === 'odometer') {
            if (odometerText) {
                const parts = clockCumulativeEarnings.toFixed(2).split('.');
                const formattedInt = parseInt(parts[0], 10).toLocaleString('ko-KR');
                odometerText.innerText = formattedInt + '.' + parts[1] + '원';
            }
        }
        
        // Mode 2: Hourglass
        if (clockMode === 'hourglass') {
            const hCumulative = document.getElementById('hourglass-cumulative-text');
            if (hCumulative) {
                hCumulative.innerText = Math.floor(clockCumulativeEarnings).toLocaleString('ko-KR') + '원';
            }
            
            // Dynamic coin spawn cost (target ~3 coins falling per second)
            const payPerSecond = annualSalary / (365 * 24 * 3600);
            const coinValue = Math.max(1, payPerSecond / 3);
            
            if (lastSpawnedAmount === 0) {
                lastSpawnedAmount = clockCumulativeEarnings;
            }
            
            const diff = clockCumulativeEarnings - lastSpawnedAmount;
            if (diff >= coinValue) {
                const coinsToSpawn = Math.min(5, Math.floor(diff / coinValue));
                for (let i = 0; i < coinsToSpawn; i++) {
                    spawnHourglassCoin();
                }
                lastSpawnedAmount = clockCumulativeEarnings;
            }
        }
        
        // Mode 3: Consumption Matcher
        if (clockMode === 'matcher') {
            consumptionItems.forEach(item => {
                const elem = document.getElementById(item.id);
                if (elem) {
                    const count = clockCumulativeEarnings / item.cost;
                    elem.innerText = count.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + item.unit;
                }
            });
        }
    }, 10);
}

function stopWageClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    if (hourglassAnimFrame) {
        cancelAnimationFrame(hourglassAnimFrame);
        hourglassAnimFrame = null;
    }
}

function initHourglassCanvas() {
    hourglassCanvas = document.getElementById('coin-hourglass-canvas');
    if (!hourglassCanvas) return;
    
    hourglassCtx = hourglassCanvas.getContext('2d');
    
    const rect = hourglassCanvas.getBoundingClientRect();
    hourglassCanvas.width = rect.width;
    hourglassCanvas.height = rect.height;
    
    hourglassCoins = [];
    settledSurfaceCoins = [];
    
    if (hourglassAnimFrame) cancelAnimationFrame(hourglassAnimFrame);
    hourglassAnimFrame = requestAnimationFrame(animateHourglass);
}

function spawnHourglassCoin() {
    if (!hourglassCanvas) return;
    
    hourglassCoins.push({
        x: hourglassCanvas.width / 2 + (Math.random() - 0.5) * 20,
        y: -12,
        radius: 7,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1 + Math.random() * 2,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.15,
        bounces: 0,
        color: '#fbbf24'
    });
    
    if (hourglassCoins.length > 50) {
        hourglassCoins.shift();
    }
}

function animateHourglass() {
    if (!hourglassCanvas || !hourglassCtx || clockMode !== 'hourglass') return;
    
    const ctx = hourglassCtx;
    const w = hourglassCanvas.width;
    const h = hourglassCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    const hynixData = getHynixSalaryData();
    const annualSalary = hynixData.gross;
    const maxEarnings = clockTimeReference === 'year' ? annualSalary : (annualSalary / 365);
    const progressRatio = Math.min(1, clockCumulativeEarnings / maxEarnings);
    
    // Gold pile height (grow up to 55% of canvas height)
    const pileHeight = Math.max(12, progressRatio * (h * 0.55));
    
    // Draw gold mound curve
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.bezierCurveTo(w * 0.25, h, w * 0.35, h - pileHeight, w / 2, h - pileHeight);
    ctx.bezierCurveTo(w * 0.65, h - pileHeight, w * 0.75, h, w, h);
    ctx.closePath();
    
    const moundGrad = ctx.createRadialGradient(w/2, h - pileHeight, 5, w/2, h, w * 0.6);
    moundGrad.addColorStop(0, '#fef08a');
    moundGrad.addColorStop(0.3, '#fbbf24');
    moundGrad.addColorStop(0.7, '#d97706');
    moundGrad.addColorStop(1, '#78350f');
    
    ctx.fillStyle = moundGrad;
    ctx.fill();
    
    // Sparks/texture Highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    const sparkleCount = Math.floor(pileHeight * 0.7);
    for (let i = 0; i < sparkleCount; i++) {
        const rx = w/2 + (Math.random() - 0.5) * (w * 0.8) * (1 - Math.random() * 0.4);
        const yLimit = h - pileHeight * Math.exp(-Math.pow(rx - w/2, 2) / (2 * Math.pow(w/3, 2)));
        const ry = yLimit + Math.random() * (h - yLimit);
        if (ry < h && ry > yLimit) {
            ctx.fillRect(rx, ry, 1.2, 1.2);
        }
    }
    
    // Draw textured surface coins
    settledSurfaceCoins.forEach(c => {
        drawCoinDisc(ctx, c.x, c.y, c.radius, c.angle);
    });
    
    // Active falling coins simulation
    for (let i = hourglassCoins.length - 1; i >= 0; i--) {
        const c = hourglassCoins[i];
        
        c.vy += 0.26; // Gravity
        c.vx *= 0.99;
        c.vy *= 0.99;
        
        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.angularVelocity;
        
        if (c.x - c.radius < 0) {
            c.x = c.radius;
            c.vx = -c.vx * 0.5;
        } else if (c.x + c.radius > w) {
            c.x = w - c.radius;
            c.vx = -c.vx * 0.5;
        }
        
        const currentPileY = h - pileHeight * Math.exp(-Math.pow(c.x - w/2, 2) / (2 * Math.pow(w/3, 2)));
        
        if (c.y >= currentPileY - c.radius) {
            c.y = currentPileY - c.radius;
            c.vy = -c.vy * 0.22;
            c.vx = c.vx * 0.75 + (Math.random() - 0.5) * 0.4;
            c.angularVelocity = c.vx * 0.25;
            c.bounces++;
            
            if (c.bounces > 2 && Math.abs(c.vy) < 0.3) {
                settledSurfaceCoins.push({
                    x: c.x,
                    y: c.y,
                    radius: c.radius,
                    angle: c.angle
                });
                
                if (settledSurfaceCoins.length > 120) {
                    settledSurfaceCoins.shift();
                }
                
                hourglassCoins.splice(i, 1);
                continue;
            }
        }
        
        drawCoinDisc(ctx, c.x, c.y, c.radius, c.angle);
    }
    
    // Spout top guidelines
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w/2 - 20, 0);
    ctx.lineTo(w/2 - 10, 12);
    ctx.moveTo(w/2 + 20, 0);
    ctx.lineTo(w/2 + 10, 12);
    ctx.stroke();
    
    hourglassAnimFrame = requestAnimationFrame(animateHourglass);
}

function drawCoinDisc(ctx, x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.closePath();
    
    const coinGrad = ctx.createRadialGradient(-r*0.25, -r*0.25, 0.5, 0, 0, r);
    coinGrad.addColorStop(0, '#fef08a');
    coinGrad.addColorStop(0.5, '#fbbf24');
    coinGrad.addColorStop(1, '#d97706');
    
    ctx.fillStyle = coinGrad;
    ctx.fill();
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(120, 53, 4, 0.85)';
    ctx.font = 'bold 7px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₩', 0, 0.5);
    
    ctx.restore();
}

window.addEventListener('resize', () => {
    if (clockMode === 'hourglass' && document.getElementById('content-clock').classList.contains('active')) {
        initHourglassCanvas();
    }
});

// --- App Initialization ---
window.addEventListener('load', () => {
    updateSimulation();
    
    // Initial sync of Tab 2 inputs and active classes
    const hynixData = getHynixSalaryData();
    ngfSalary = hynixData.gross;
    updateMiniSwitcherActiveClasses();
    updateNgfSimulation();
});

