function openTab(tabName) {
    // Hide all tab contents
    var tabContents = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = 'none';
    }

    // Remove "active" class from all tab links
    var tabLinks = document.querySelectorAll('.nav-link');
    for (var i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove('active');
    }

    // Show the selected tab content
    document.getElementById(tabName).style.display = 'block';

    // Add "active" class to the selected tab link
    var activeTabLink = document.querySelector('button.nav-link[onclick="openTab(\'' + tabName + '\')"]');
    if (activeTabLink) {
        activeTabLink.classList.add('active');
    }
}

// Show the default tab on page load
openTab('tab1');
