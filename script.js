document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const plannerForm = document.getElementById('plannerForm');
    const appScreen = document.getElementById('app');
    const reviewScreen = document.getElementById('review');
    const planScreen = document.getElementById('plan');
    const summaryDiv = document.getElementById('summary');
    const closeReviewBtn = document.getElementById('closeReview');
    const payBtn = document.getElementById('pay');
    
    // --- INTEREST CHIPS SYSTEM ---
    const chips = document.querySelectorAll('.chip');
    const selectedInterests = new Set();

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const interest = chip.textContent.trim();
            if (selectedInterests.has(interest)) {
                selectedInterests.delete(interest);
                chip.classList.remove('active');
            } else {
                selectedInterests.add(interest);
                chip.classList.add('active');
            }
        });
    });

    // --- FORM SUBMISSION (GO TO REVIEW SCREEN) ---
    let formData = {};
    plannerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        formData = {
            destination: document.getElementById('destination').value,
            startDate: document.getElementById('startDate').value || 'Flexible',
            days: document.getElementById('days').value,
            budget: document.getElementById('budget').value,
            travelers: document.getElementById('travelers').value,
            interests: Array.from(selectedInterests).join(', ') || 'General Sightseeing',
            notes: document.getElementById('notes').value || 'None'
        };

        summaryDiv.innerHTML = `
            <p>📍 <strong>Destination:</strong> ${formData.destination}</p>
            <p>📅 <strong>Duration:</strong> ${formData.days} Days (Starts: ${formData.startDate})</p>
            <p>💰 <strong>Budget limit:</strong> $${formData.budget}</p>
            <p>👥 <strong>Party size:</strong> ${formData.travelers}</p>
            <p>🎯 <strong>Interests:</strong> ${formData.interests}</p>
            <p>📝 <strong>Special requests:</strong> ${formData.notes}</p>
        `;

        appScreen.classList.add('hidden');
        reviewScreen.classList.remove('hidden');
    });

    closeReviewBtn.addEventListener('click', () => {
        reviewScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
    });

    // --- MOCK DATA FOR DESIGN AND LAYOUT TESTING ---
    payBtn.addEventListener('click', () => {
        reviewScreen.classList.add('hidden');
        planScreen.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const mockData = {
            stay: `<ul>
                    <li><strong>🌟 Luxury Option:</strong> Hilton Bosphorus (Approx. $180/night) - Great central location.</li>
                    <li><strong>📉 Budget Option:</strong> Stay Inn Taksim Hostel (Approx. $35/night) - Highly rated for solo travelers.</li>
                   </ul>`,
            transport: `<p>🚌 <strong>Best Choice:</strong> Istanbul Kart (Public Metro & Tram) is highly recommended. It costs around $1.50 per ride.</p>
                        <p>🚖 <strong>Taxis:</strong> Use BiTaksi app to avoid scams. Estimated budget for transit: $40 total.</p>`,
            experiences: `<ul>
                            <li><strong>🕌 Blue Mosque & Hagia Sophia:</strong> Free entry, best visited in the early morning.</li>
                            <li><strong>🍴 Food Recommendation:</strong> Try Tarihi Sultanahmet Köftecisi for authentic local cuisine ($12 per person).</li>
                          </ul>`,
            money: `<p>💵 <strong>Daily Budget Allocation:</strong></p>
                    <ul>
                        <li>Food & Cafe: 40%</li>
                        <li>Attractions & Entry Fees: 30%</li>
                        <li>Local Transport: 15%</li>
                        <li>Emergency / Shopping Cash: 15%</li>
                    </ul>`,
            daysPlan: `<ol>
                        <li><strong>Day 1:</strong> Arrival, check-in at hotel, and evening walk around Taksim Square & Istiklal Street.</li>
                        <li><strong>Day 2:</strong> Historic tour of Sultanahmet (Topkapi Palace, Hagia Sophia) and dinner by the Bosphorus.</li>
                       </ol>`
        };

        // Inject data into the UI sections
        document.getElementById('planTitle').textContent = `Your Trip to ${formData.destination}`;
        document.getElementById('planIntro').textContent = `Customized strategy for ${formData.days} days with a $${formData.budget} budget.`;
        
        document.getElementById('stayContent').innerHTML = mockData.stay;
        document.getElementById('transportContent').innerHTML = mockData.transport;
        document.getElementById('experiencesContent').innerHTML = mockData.experiences;
        document.getElementById('moneyContent').innerHTML = mockData.money;
        document.getElementById('daysContent').innerHTML = mockData.daysPlan;
    });

    // --- TAB SWITCHER LOGIC ---
    const tabs = document.querySelectorAll('.plan-tab');
    const sections = document.querySelectorAll('.plan-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetSectionId = tab.getAttribute('data-target');

            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));

            tab.classList.add('active');
            document.getElementById(targetSectionId).classList.remove('hidden');
        });
    });
});
