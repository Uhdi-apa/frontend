"use client";
import {Accordion, AccordionItem} from "@heroui/accordion";

export default function Map() {
    const defaultContent =
        "상처를 깨끗한 물과 비누로 5분 이상 충분히 씻어내고 과산화수소, 베타딘 또는 알코올 소독제로 상처를 소독하세요.";

    return (
        <>
            <div className="fixed top-0 inset-x-0 z-10">
                <Accordion
                    variant="shadow"
                    className="bg-white rounded-b-2xl shadow-xl overflow-hidden"
                >
                    <AccordionItem
                        key="tetanus"
                        title={
                            <div className="px-5 py-3 flex items-center justify-between">
                                <span className="font-bold text-2xl">
                                    상처로 인한 파상풍
                                </span>
                            </div>
                        }
                        className="w-full pt-32"
                    >
                        <div className="px-5 pb-6 font-normal text-sm whitespace-pre-line">
                            {defaultContent}
                        </div>
                    </AccordionItem>
                </Accordion>
            </div>
            <div className="relative h-screen w-screen">
                <div className="w-full h-full bg-gray-100">
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        지도 컴포넌트가 여기에 들어갑니다
                    </div>
                </div>
            </div>
        </>
    )
        ;
}
