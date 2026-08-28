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

    // --- STRIPE PAYMENT REDIRECTION ---
    payBtn.addEventListener('click', () => {
        localStorage.setItem('pendingTripData', JSON.stringify(formData));
        localStorage.setItem('hasPaid', 'true'); 

        // ⚠️ REPLACE THIS LINK WITH YOUR LIVE STRIPE PAYMENT LINK ⚠️
        window.location.href = "https://stripe.com"; 
    });

    // --- VERIFY RETURN FLOW FROM STRIPE AND RENDER RESULT ---
    window.addEventListener('load', async () => {
        const hasPaid = localStorage.getItem('hasPaid');
        const savedData = localStorage.getItem('pendingTripData');

        if (hasPaid === 'true' && savedData) {
            localStorage.removeItem('hasPaid');
            localStorage.removeItem('pendingTripData');

            appScreen.classList.add('hidden');
            reviewScreen.classList.add('hidden');
            planScreen.classList.remove('hidden');

            try {
                // Fixed fetch route pointing exactly to your /api/plan path
                const response = await fetch('/api/plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: savedData
                });

                if (!response.ok) throw new Error('Live generation stream failed.');
                const data = await response.json();

                const parsedData = JSON.parse(savedData);
                document.getElementById('planTitle').textContent = `Your Trip to ${parsedData.destination}`;
                document.getElementById('planIntro').textContent = `Customized strategy for ${parsedData.days} days with a $${parsedData.budget} budget.`;
                
                document.getElementById('stayContent').innerHTML = data.stay;
                document.getElementById('transportContent').innerHTML = data.transport;
                document.getElementById('experiencesContent').innerHTML = data.experiences;
                document.getElementById('moneyContent').innerHTML = data.money;
                document.getElementById('daysContent').innerHTML = data.daysPlan;

            } catch (error) {
                document.getElementById('planTitle').textContent = "Generation Error";
                document.getElementById('planIntro').textContent = "Something went wrong communicating with Gemini. Please try again.";
                console.error(error);
            }
        }
    });

    // --- TAB NAVIGATION SELECTION ENGINE ---
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
