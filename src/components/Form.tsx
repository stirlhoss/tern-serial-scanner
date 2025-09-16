import { createAsync } from "@solidjs/router";
import { createSignal, Suspense, For, Show } from "solid-js";
import { useSession } from "~/lib/Context";
import { SerialNumberData } from "~/routes/api/submit-serial-numbers";

interface Id {
  id: string;
}
const getSalesOrderItems = async (soId: Id) => {
  if (!soId) return null;
  const res = await fetch(
    `/api/salesorder/${encodeURIComponent(soId.id)}/items`,
  );
  if (!res.ok) throw new Error("Failed to fetch sales order");
  return res.json();
};

const getSalesOrderById = async (soId: Id) => {
  if (!soId) return null;
  const res = await fetch(`/api/salesorder/${encodeURIComponent(soId.id)}`);
  if (!res.ok) throw new Error("Failed to fetch sales order");
  return res.json();
};

const getSalesOrderId = async (soNum: string) => {
  if (!soNum) return null;
  const res = await fetch(
    `/api/sales-order-id?soNum=${encodeURIComponent(soNum)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch sales order");
  return res.json();
};

export default function Form() {
  const { session } = useSession();
  const userLocation = () => session()?.location?.toString();
  const [soNum, setSoNum] = createSignal("");
  const [selectedLocation, setSelectedLocation] = createSignal(userLocation());
  const [serialNumbers, setSerialNumbers] = createSignal<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const soId = createAsync(() => getSalesOrderId(soNum()));
  const salesOrder = createAsync(() => getSalesOrderById(soId()));
  const items = createAsync(() => getSalesOrderItems(soId()));

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

      // Reset form state after successful submission
      setSoNum("");
      setSerialNumbers({});
    } catch (error) {
      console.error("Failed to submit serial numbers:", error);
      alert("Failed to submit serial numbers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSoNum(e.currentTarget.value);
    }
  };

  return (
    <>
      <div class="flex flex-col sm:flex-row justify-center gap-2 text-xl">
        <div class="flex flex-col gap-4 text-xl">
          <label for="sonum">Sales order number</label>
          <input
            type="text"
            id="sonum"
            class="w-s shadow-md m-auto text-center box-content border-solid border-black border-2 rounded-md px-2 py-1"
            onKeyDown={handleKeyDown}
            onBlur={(e) => setSoNum(e.currentTarget.value)}
            placeholder="Enter Sales order number"
          />
        </div>
        <div class="flex flex-col gap-4 text-xl">
          <label for="location">Location</label>
          <select
            id="location"
            class="w-s shadow-md m-auto text-center box-content border-solid border-black border-2 rounded-md px-2 py-1"
            value={selectedLocation()}
            onInput={(e) => setSelectedLocation(e.currentTarget.value)}
          >
            <option value="15">2 - Olney</option>
            <option value="16">1 - West</option>
          </select>
        </div>
      </div>

      <Suspense fallback={<div>loading...</div>}>
        <h2 class="text-3xl my-4">{salesOrder()?.entity.refName}</h2>
      </Suspense>

      <form onSubmit={handleSubmit}>
        <Suspense fallback={<div>loading...</div>}>
          <div class="flex-col">
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
          </div>
        </Suspense>

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
