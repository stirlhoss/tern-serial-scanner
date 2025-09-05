import { createSignal, createResource, Suspense, For, Show } from "solid-js";
import { SerialNumberData } from "~/routes/api/submit-serial-numbers";

const getSalesOrderItems = async (soId: string) => {
  if (!soId) return null;
  const res = await fetch(`/api/salesorder/${encodeURIComponent(soId)}/items`);
  if (!res.ok) throw new Error("Failed to fetch sales order");
  return res.json();
};

const getSalesOrderById = async (soId: string) => {
  if (!soId) return null;
  const res = await fetch(`/api/salesorder/${encodeURIComponent(soId)}`);
  if (!res.ok) throw new Error("Failed to fetch sales order");
  return res.json();
};

const getSalesOrderId = async (soNum: string) => {
  if (!soNum) return null;
  const res = await fetch(`/api/transaction/${encodeURIComponent(soNum)}`);
  if (!res.ok) throw new Error("Failed to fetch sales order");
  const parsed = await res.json();
  return parsed[0].id;
};

export default function Form() {
  const [soNum, setSoNum] = createSignal("");
  const [inputValue, setInputValue] = createSignal("");
  const [selectedLocation, setSelectedLocation] = createSignal("15");
  const [serialNumbers, setSerialNumbers] = createSignal<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [soId] = createResource(soNum, getSalesOrderId);
  const [salesOrder] = createResource(soId, getSalesOrderById);
  const [items] = createResource(soId, getSalesOrderItems);

  const updateSerialNumber = (inputId: string, value: string) => {
    setSerialNumbers((prev) => ({ ...prev, [inputId]: value }));
  };

  const itemsFilteredByLoc = () => {
    if (!items()) return null;
    return items().filter(
      (item) => item.location && item.location.id === selectedLocation(),
    );
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const currentItems = itemsFilteredByLoc();
      if (!currentItems) return;

      const serialData: SerialNumberData[] = [];

      currentItems.forEach((item: any, itemIndex: number) => {
        const itemSerials: string[] = [];
        for (let i = 0; i < item.quantity; i++) {
          const inputId = `${itemIndex}-${i}`;
          const serial = serialNumbers()[inputId] || "";
          if (serial.trim()) {
            itemSerials.push(serial.trim());
          }
        }

        if (itemSerials.length > 0) {
          serialData.push({
            itemLineId: item.line,
            serialNumbers: itemSerials,
          });
        }
      });

      console.log("Serial number data:", serialData);

      // TODO: Send to your backend API
      await fetch(`/api/submit-serial-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: soId(),
          salesOrderNumber: soNum(),
          serialNumbers: serialData,
        }),
      });

      alert("Serial numbers submitted successfully!");
    } catch (error) {
      console.error("Failed to submit serial numbers:", error);
      alert("Failed to submit serial numbers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div class="flex flex-row justify-center gap-2 text-xl">
        <div class="flex flex-col gap-4 text-xl">
          <label for="sales-order-number">Sales order number</label>
          <input
            type="text"
            id="sonum"
            name="sales-order-number"
            class="w-s m-auto text-center border-dashed border-black border-2 rounded-md px-2 py-1"
            value={inputValue()}
            onInput={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSoNum(e.currentTarget.value);
              }
            }}
            placeholder="Enter Sales order number"
          />
        </div>
        <div class="flex flex-col gap-4 text-xl">
          <label for="location">Location</label>
          <select
            id="location"
            name="location"
            class="w-s m-auto text-center border-dashed border-black border-2 rounded-md px-2 py-1"
            value={selectedLocation()}
            onInput={(e) => setSelectedLocation(e.currentTarget.value)}
          >
            <option value="15">2-Olney</option>
            <option value="16">1-West</option>
          </select>
        </div>
      </div>
      <Suspense>
        <h2 class="text-3xl my-4">{salesOrder()?.entity.refName}</h2>
      </Suspense>

      <form onSubmit={handleSubmit}>
        <div class="flex-col">
          <Suspense>
            <For each={itemsFilteredByLoc()}>
              {(item, index) => (
                <div class="flex place-content-between gap-2 text-left border-b-2">
                  {index() + 1}
                  <span class="text-xl m-auto">{item.description}</span>

                  <div class="flex flex-col gap-2 my-4">
                    <For each={Array.from({ length: item.quantity })}>
                      {(item, index2) => (
                        <input
                          type="text"
                          id={`${index()}-${index2()}`}
                          class="w-s m-auto text-center border-solid border-black border-2 rounded-md"
                          value={
                            serialNumbers()[`${index()}-${index2()}`] || ""
                          }
                          onInput={(e) =>
                            updateSerialNumber(
                              `${index()}-${index2()}`,
                              e.currentTarget.value,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const nextInput = e.currentTarget
                                .nextElementSibling as HTMLInputElement;
                              if (nextInput) {
                                nextInput.focus();
                              } else {
                                const nextRowInput = document.getElementById(
                                  `${index() + 1}-0`,
                                ) as HTMLInputElement;
                                if (nextRowInput) {
                                  nextRowInput.focus();
                                }
                              }
                            }
                          }}
                          placeholder={`Serial ${index2() + 1}`}
                        />
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </Suspense>
        </div>

        <Show when={salesOrder()}>
          <button
            type="submit"
            class="px-4 py-2 my-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isSubmitting()}
          >
            {isSubmitting() ? "Submitting..." : "Submit Serial Numbers"}
          </button>
        </Show>
      </form>
    </>
  );
}
