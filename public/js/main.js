document.addEventListener('DOMContentLoaded', () => {
  const datePicker = document.getElementById('datePicker');
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected) {
        const url = new URL(window.location.href);
        url.searchParams.set('date', selected);
        window.location.href = url.toString();
      }
    });
  }
});
