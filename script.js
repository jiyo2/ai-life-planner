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
                chip.classList.remove('active'); // Style this class in your CSS for selection status
            } else {
                selectedInterests.add(interest);
                chip.classList.add('active');
            }
        });
    });

    // --- FORM SUBMISSION (GOTO REVIEW) ---
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

        // Render summary text for payment window review
        summaryDiv.innerHTML = `
            <p>📍 <strong>Destination:</strong> ${formData.destination}</p>
            <p>📅 <strong>Duration:</strong> ${formData.days} Days (Starts: ${formData.startDate})</p>
            <p>💰 <strong>Budget limit:</strong> $${formData.budget}</p>
            <p>👥 <strong>Party size:</strong> ${formData.travelers}</p>
            <p>🎯 <strong>Interests:</strong> ${formData.interests}</p>
            <p>📝 <strong>Special requests:</strong> ${formData.notes}</p>
        `;

        // Switch screen view
        appScreen.classList.add('hidden');
        reviewScreen.classList.remove('hidden');
    });

    // --- CANCEL/EDIT REVIEW BUTTON ---
    closeReviewBtn.addEventListener('click', () => {
        reviewScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
    });

    // --- SIMULATE PAYMENT AND CALL BACKEND ---
    payBtn.addEventListener('click', async () => {
        reviewScreen.classList.add('hidden');
        planScreen.classList.remove('hidden');

        // Scroll back to top to view generated itinerary loader
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            // Replace with your production URL once hosted (e.g., Vercel, Render)
            const response = await fetch('http://localhost:3000/api/plan-trip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to generate plan.');
            const data = await response.json();

            // Populate content sections safely into matching DOM text areas
            document.getElementById('planTitle').textContent = `Your Trip to ${formData.destination}`;
            document.getElementById('planIntro').textContent = `Customized strategy for ${formData.days} days with a $${formData.budget} budget limit.`;
            
            document.getElementById('stayContent').innerHTML = data.stay || 'No accommodation strategy returned.';
            document.getElementById('transportContent').innerHTML = data.transport || 'No transport details returned.';
            document.getElementById('experiencesContent').innerHTML = data.experiences || 'No experiences returned.';
            document.getElementById('moneyContent').innerHTML = data.money || 'No budget breakdowns returned.';
            document.getElementById('daysContent').innerHTML = data.daysPlan || 'No day-by-day plan returned.';

        } catch (error) {
            document.getElementById('planTitle').textContent = "Generation Error";
            document.getElementById('planIntro').textContent = "Something went wrong communicating with Gemini. Please try again.";
            console.error(error);
        }
    });

    // --- TAB SWITCHER LOGIC ---
    const tabs = document.querySelectorAll('.plan-tab');
    const sections = document.querySelectorAll('.plan-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetSectionId = tab.getAttribute('data-target');

            // Deactivate all old selections
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));

            // Focus current active view element
            tab.classList.add('active');
            document.getElementById(targetSectionId).classList.remove('hidden');
        });
    });
});
