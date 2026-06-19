// Toggle custom radio buttons in the pending deliverables/notes section
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.note-item').forEach(item => {
        const radio = item.querySelector('.custom-radio');
        
        radio.addEventListener('click', () => {
            item.classList.toggle('completed');
            
            // Update the checkmark icon based on state
            if(item.classList.contains('completed')) {
                radio.innerHTML = '<i class="fa-solid fa-check"></i>';
            } else {
                radio.innerHTML = '';
            }
        });
    });
});