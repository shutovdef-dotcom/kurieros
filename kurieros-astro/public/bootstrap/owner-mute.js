(function() {
	try {
		var qs = window.location.search || '';
		if (qs.indexOf('owner-mute=1') !== -1) {
			localStorage.setItem('kurerok-owner-mute', '1');
			console.info('[kurerok] Analytics muted on this device. Use ?owner-unmute=1 to restore.');
		} else if (qs.indexOf('owner-unmute=1') !== -1) {
			localStorage.removeItem('kurerok-owner-mute');
			console.info('[kurerok] Analytics restored.');
		}
		window.__kurerokSkipAnalytics = localStorage.getItem('kurerok-owner-mute') === '1';
	} catch (_) {
		// If storage is unavailable, analytics fire as usual.
	}
})();
