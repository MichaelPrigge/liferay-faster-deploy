// ==UserScript==
// @name           Patcher Read-Only Views Links
// @namespace      holatuwol
// @version        2.3
// @updateURL      https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/patcher.user.js
// @downloadURL    https://github.com/holatuwol/liferay-faster-deploy/raw/master/userscripts/patcher.user.js
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/builds/*
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/fixes/*
// @match          https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
a.included-in-baseline,
a.included-in-baseline:hover {
  color: #ddd;
  text-decoration: line-through;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId,
#_1_WAR_osbpatcherportlet_patcherProjectVersionId {
  width: auto;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId option {
  display: none;
}

#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="6.x"] option[data-liferay-version="6.x"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.0"] option[data-liferay-version="7.0"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.1"] option[data-liferay-version="7.1"],
#_1_WAR_osbpatcherportlet_patcherProductVersionId[data-liferay-version="7.2"] option[data-liferay-version="7.2"] {
  display: block;
}
`;

document.head.appendChild(styleElement);

var portletId = '1_WAR_osbpatcherportlet';
var ns = '_' + portletId + '_';

/**
 * Utility function to convert an object into a query string with namespaced
 * parameter names.
 */

function getQueryString(params) {
  return Object.keys(params).map(key => (key.indexOf('p_p_') == 0 ? key : (ns + key)) + '=' + params[key]).join('&');
}

/**
 * Shorthand for fetching an element with a namespaced ID.
 */

function querySelector(target) {
  return document.querySelector('#' + ns + target);
}

/**
 * Replaces any links to a jenkins fix pack builder result with a link that
 * ends with '/consoleText' to take you directly to the build log.
 */

function replaceJenkinsLinks() {
  var links = document.querySelectorAll('a[href*="/job/fixpack-builder"]');

  for (var i = 0; i < links.length; i++) {
    var href = links[i].href;

    if (href.indexOf('consoleText') != -1) {
      continue;
    }

    if (href.charAt(href.length - 1) != '/') {
      href += '/';
    }

    links[i].href = href + 'consoleText';
  }
}

/**
 * Replaces any links that would have opened in a modal dialog / popup
 * window with one that opens in a regular new window.
 */

function replacePopupWindowLinks() {
  var buttons = document.querySelectorAll('button[onclick]');

  for (var i = 0; i < buttons.length; i++) {
    var onclickAttribute = buttons[i].attributes['onclick'];
    var onclickValue = onclickAttribute.value;

    if (onclickValue.indexOf('javascript:') == 0) {
      onclickValue = onclickValue.substring('javascript:'.length);
    }

    onclickValue = onclickValue.replace(/Liferay.Patcher.openWindow\('([^']*)',[^\)]*/g, "window.open('$1','_blank'");
    onclickValue = onclickValue.replace('?p_p_state=pop_up', '');
    onclickValue = onclickValue.replace('&p_p_state=pop_up', '');

    onclickAttribute.value = onclickValue;
  }
}

/**
 * Utility function to extract the currently selected value of a
 * select box.
 */

function getSelectedValue(target) {
  var select = querySelector(target);

  if (!select || select.selectedIndex == -1) {
    return '';
  }

  return select.options[select.selectedIndex].value;
}

/**
 * Update the link to "Use as Build Template" to include additional
 * parameters so that they can be auto-selected.
 */

function addBaselineToBuildTemplate() {
  var baselineLinks = Array.from(document.querySelectorAll('.taglib-text-icon')).filter(function(x) { return x.textContent.toLowerCase() == 'use as build template'; });

  if (baselineLinks.length != 1) {
    return;
  }

  var buildTemplateAnchor = baselineLinks[0].parentNode;

  buildTemplateAnchor.href += '&' + getQueryString({
    'patcherProductVersionId': getSelectedValue('patcherProductVersionId'),
    'patcherProjectVersionId': getSelectedValue('patcherProjectVersionId')
  });
}

/**
 * Utility function replace the specified input element with the given HTML
 * view, creating a hidden input so that forms still submit properly.
 */

function replaceNode(oldNode, newHTML) {
  var newNode = document.createElement('span');
  newNode.innerHTML = newHTML;

  var newHiddenInputNode = document.createElement('input');
  newHiddenInputNode.type = 'hidden';
  newHiddenInputNode.name = oldNode.name;
  newHiddenInputNode.id = oldNode.id;

  if (oldNode.innerHTML) {
    newHiddenInputNode.value = oldNode.innerHTML
  }
  else {
    newHiddenInputNode.value = oldNode.value;
  }

  var parentNode = oldNode.parentNode;

  parentNode.replaceChild(newHiddenInputNode, oldNode);
  parentNode.insertBefore(newNode, newHiddenInputNode);
}

/**
 * Replaces a GMT date with a date in the user's current time zone, according to
 * their web browser.
 */

function replaceDate(target) {
  var labelNode = document.querySelector('label[for="' + ns + target + '"]');

  if (!labelNode) {
    return;
  }

  var containerNode = labelNode.parentNode;

  var dateNode = containerNode.childNodes[2];

  var dateString = new Date(dateNode.textContent.trim() + ' GMT-0000').toString();

  dateNode.textContent = dateString;
}

/**
 * Replaces the list of fixes with a list of JIRA links.
 */

function replaceFixes(target) {
  var oldNode = querySelector(target);

  var isConflict = false;

  var statusNode = document.querySelector('label[for="' + ns + 'patcher-status"]');

  if (statusNode) {
    isConflict = statusNode.parentNode.textContent.indexOf('Conflict') != -1;
  }

  if (oldNode && oldNode.readOnly) {
    replaceNode(oldNode, oldNode.innerHTML.split(',').map(
      ticket => {
        if (ticket.toUpperCase() != ticket) {
          return ticket;
        }

        var ticketURL = 'https://issues.liferay.com/browse/' + ticket;

        if (isConflict) {
          var productVersionId = querySelector('patcherProductVersionId').value;
          var projectVersionId = querySelector('patcherProjectVersionId').value;

          var params = {
            advancedSearch: true,
            andOperator: true,
            hideOldFixVersions: true,
            patcherFixName: ticket,
            patcherProductVersionId: productVersionId,
            patcherProjectVersionIdFilter: projectVersionId
          };

          ticketURL = 'https://patcher.liferay.com/group/guest/patching/-/osb_patcher?' + getQueryString(params);
        }

        var className = '';

        if (target == 'patcherBuildOriginalName' && !document.querySelector('a[href="' + ticketURL + '"]')) {
          className = 'included-in-baseline'
        }

        return '<a class="' + className + '" href="' + ticketURL + '" target="_blank">' + ticket + '</a>';
      }
    ).join(', '));
  }
}

/**
 * Replaces the account name with a link to all builds for the account.
 */

function replaceAccountLink(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    var params = {
      'p_p_id': portletId,
      'patcherBuildAccountEntryCode': oldNode.value,
      'patcherProductVersionId': querySelector('patcherProductVersionId').value
    };

    replaceNode(oldNode, '<a href="https://patcher.liferay.com/group/guest/patching/-/osb_patcher/accounts/view?' + getQueryString(params) + '" target="_blank">' + oldNode.value + '</a>');
  }
}

/**
 * Replaces a ticket name with a link to LESA or Help Center.
 */

function replaceLesaLink(target) {
  var oldNode = querySelector(target);

  if (oldNode && oldNode.readOnly) {
    var ticketURL;

    if (oldNode.value.indexOf('https:') == 0) {
      ticketURL = oldNode.value;
    }
    else if (isNaN(oldNode.value)) {
      ticketURL = 'https://web.liferay.com/group/customer/support/-/support/ticket/' + oldNode.value;
    }
    else {
      ticketURL = 'https://liferay-support.zendesk.com/agent/tickets/' + oldNode.value;
    }

    replaceNode(oldNode, '<a href="' + ticketURL + '" target="_blank">' + ticketURL + '</a>');
  }
}

/**
 * Adds a new element to the page to allow you to select from a list of
 * Liferay versions before choosing a product version.
 */

function addProductVersionFilter() {
  var productVersionSelect = querySelector('patcherProductVersionId');

  if (!productVersionSelect || productVersionSelect.disabled) {
    return;
  }

  var versions = ['', '6.x', '7.0', '7.1', '7.2'];

  for (var i = 0; i < productVersionSelect.options.length; i++) {
    var option = productVersionSelect.options[i];

    for (var j = 1; j < versions.length; j++) {
      if ((option.textContent.indexOf('DXP ' + versions[j]) != -1) || (option.textContent.indexOf('Portal ' + versions[j]) != -1)) {
        option.setAttribute('data-liferay-version', versions[j]);
      }
    }
  }

  var liferayVersionSelect = document.createElement('select');
  liferayVersionSelect.id = ns + 'liferayVersion';

  for (var i = 0; i < versions.length; i++) {
    var option = document.createElement('option');
    option.value = versions[i];
    option.textContent = versions[i];
    liferayVersionSelect.appendChild(option);
  };

  liferayVersionSelect.onchange = updateProductVersionSelect;
  productVersionSelect.parentNode.insertBefore(liferayVersionSelect, productVersionSelect);
}

/**
 * Updates the product version select based on the value of the Liferay
 * version select.
 */

function updateProductVersionSelect() {
  var productVersionSelect = querySelector('patcherProductVersionId');

  var liferayVersion = getSelectedValue('liferayVersion');
  productVersionSelect.setAttribute('data-liferay-version', liferayVersion);

  if (productVersionSelect.selectedIndex != -1) {
    var selectedOption = productVersionSelect.options[productVersionSelect.selectedIndex];

    if (selectedOption.getAttribute('data-liferay-version') == liferayVersion) {
      if (selectedOption.textContent.trim() == 'DXP ' + liferayVersion) {
        setTimeout(updateProjectVersionOrder, 500);
      }

      return;
    }
  }

  var option = productVersionSelect.querySelector('option[data-liferay-version="' + liferayVersion + '"]');

  if (option) {
    option.selected = true;
    unsafeWindow[ns + 'productVersionOnChange'](option.value);
    setTimeout(updateProjectVersionOrder, 500);
  }
}

/**
 * Converts the tag name into a seven digit version number that can be
 * used for sorting. First four digits are the base version (7010, 7110),
 * and the remander are the fix pack level.
 */

function getLiferayVersion(version) {
  if (version.indexOf('fix-pack-de-') != -1) {
    var pos = version.indexOf('-', 12);
    var deVersion = version.substring(12, pos);
    var shortVersion = version.substring(pos + 1);

    pos = shortVersion.indexOf('-private');

    if (pos != -1) {
      shortVersion = shortVersion.substring(0, pos);
    }

    return parseInt(shortVersion) * 1000 + parseInt(deVersion);
  }
  else if (version.indexOf('fix-pack-dxp-') != -1) {
    var pos = version.indexOf('-', 13);
    var deVersion = version.substring(13, pos);
    var shortVersion = version.substring(pos + 1);

    pos = shortVersion.indexOf('-private');

    if (pos != -1) {
      shortVersion = shortVersion.substring(0, pos);
    }

    return parseInt(shortVersion) * 1000 + parseInt(deVersion);
  }
  else if (version.indexOf('fix-pack-base-') != -1) {
    var shortVersion = version.substring('fix-pack-base-'.length);
    var pos = shortVersion.indexOf('-private');

    if (pos != -1) {
      shortVersion = shortVersion.substring(0, pos);
    }

    pos = shortVersion.indexOf('-');

    if (pos == -1) {
      return parseInt(shortVersion) * 1000;
    }

    return parseInt(shortVersion.substring(0, pos)) * 1000 + parseInt(shortVersion.substring(pos + 3));
  }
  else {
    var shortVersion = /[0-9]*\.[0-9]/.exec(version)[0].replace('.', '');

    return parseInt(shortVersion) * 100 * 1000;
  }
}

/**
 * Comparison function that uses getLiferayVersion to compute versions,
 * and then sorts in alphabetical order for equivalent versions (thus,
 * we get private branches sorted after the equivalent public branch).
 */

function compareLiferayVersions(a, b) {
  var aValue = getLiferayVersion(a.textContent);
  var bValue = getLiferayVersion(b.textContent);

  if (aValue != bValue) {
    return aValue - bValue;
  }

  return a > b ? 1 : a < b ? -1 : 0;
}

/**
 * Places the project versions in numeric order rather than alphabetical
 * order, to make it easier to find the latest baseline.
 */

function updateProjectVersionOrder() {
  var projectVersionSelect = querySelector('patcherProjectVersionId');

  var sortedOptions =  Array.from(projectVersionSelect.options).sort(compareLiferayVersions);

  for (var i = 0; i < sortedOptions.length; i++) {
    projectVersionSelect.appendChild(sortedOptions[i]);
  }
}

/**
 * Selects anything that was specified in the query string.
 */

function updateFromQueryString() {
  var liferayVersionSelect = querySelector('liferayVersion');

  if (!liferayVersionSelect) {
    return;
  }

  var productVersionSelect = querySelector('patcherProductVersionId');

  var re = new RegExp(ns + 'patcherProductVersionId=(\\d+)');
  var match = re.exec(document.location.search);

  if (match) {
    var patcherProductVersionId = match[1];
    var option = productVersionSelect.querySelector('option[value="' + patcherProductVersionId + '"]');

    if (option) {
      var liferayVersion = option.getAttribute('data-liferay-version');

      option = liferayVersionSelect.querySelector('option[value="' + liferayVersion + '"]');

      if (option) {
        option.selected = true;
        updateProductVersionSelect();
      }
    }
  }

  var projectVersionSelect = querySelector('patcherProjectVersionId');

  re = new RegExp(ns + 'patcherProjectVersionId=(\\d+)');
  match = re.exec(document.location.search);

  if (match) {
    var patcherProjectVersionId = match[1];
    var option = projectVersionSelect.querySelector('option[value="' + patcherProjectVersionId + '"]');

    if (option) {
      option.selected = true;
    }
    else {
      setTimeout(updateFromQueryString, 500);
    }
  }
}

// Run all the changes we need to the page.

replaceJenkinsLinks();
replacePopupWindowLinks();
addBaselineToBuildTemplate();
replaceFixes('patcherFixName');
replaceFixes('patcherBuildName');
replaceFixes('patcherBuildOriginalName');
replaceAccountLink('accountEntryCode');
replaceAccountLink('patcherBuildAccountEntryCode');
replaceLesaLink('lesaTicket');
replaceLesaLink('supportTicket');
replaceDate('createDate');
replaceDate('modifiedDate');
addProductVersionFilter();

setTimeout(updateFromQueryString, 500);