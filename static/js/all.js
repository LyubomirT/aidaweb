
const menu = document.querySelector('#menu');
const openBtn = document.querySelector('#open-btn');
const menuBtn = document.querySelector('#close-btn');

menuBtn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
    }
);

openBtn.addEventListener('click', () => {
    alert('click');
    menu.classList.toggle('hidden');
    }
);


