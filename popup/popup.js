const fillButton = document.querySelector("#fillForm");
const requiredOnlyInput = document.querySelector("#requiredOnly");
const statusOutput = document.querySelector("#status");

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked')?.value ?? "empty";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(message) {
  statusOutput.textContent = message;
}

fillButton.addEventListener("click", async () => {
  fillButton.disabled = true;
  setStatus("Filling form…");

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      throw new Error("No active tab is available.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AUTO_FILL_FORM",
      options: {
        mode: selectedMode(),
        requiredOnly: requiredOnlyInput.checked
      }
    });

    setStatus(`Filled ${response.filledCount} field${response.filledCount === 1 ? "" : "s"}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to fill this page.");
  } finally {
    fillButton.disabled = false;
  }
});
