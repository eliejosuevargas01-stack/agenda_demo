(function feedbackWidgetBootstrap(){
  try {
    var current = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (current === 'feedback.html') return;
    if (document.querySelector('.feedback-fab')) return;

    var anchor = document.createElement('a');
    anchor.className = 'feedback-fab';
    anchor.href = 'feedback.html?origem=' + encodeURIComponent(window.location.pathname + window.location.search);
    anchor.setAttribute('aria-label', 'Enviar sugestao para melhorar o app');
    anchor.title = 'Sugestoes para melhorar o app';
    anchor.innerHTML = '<span class="feedback-fab__icon">💡</span><span class="feedback-fab__label">Sugestoes</span>';

    document.addEventListener('DOMContentLoaded', function(){
      if (document.body && !document.querySelector('.feedback-fab')) {
        document.body.appendChild(anchor);
      }
    });

    if (document.readyState !== 'loading' && document.body && !document.querySelector('.feedback-fab')) {
      document.body.appendChild(anchor);
    }
  } catch (err) {
    console.warn('Feedback widget nao foi carregado:', err);
  }
})();
