import React from "react";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";

export type IconName =
  | "send"
  | "sliders"
  | "share"
  | "refresh"
  | "user"
  | "star"
  | "plane"
  | "hotel"
  | "train"
  | "bus"
  | "clock"
  | "calendar"
  | "check"
  | "close"
  | "arrow-right"
  | "arrow-up-right"
  | "arrow-left"
  | "sun"
  | "moon"
  | "settings"
  | "search"
  | "message-square"
  | "log-in"
  | "mountain"
  | "building"
  | "compass"
  | "sparkles"
  | "shield"
  | "briefcase"
  | "menu"
  | "map-pin"
  | "chevron-down"
  | "chevron-up"
  | "chevron-right"
  | "chevron-left"
  | "filter"
  | "restaurant"
  | "water"
  | "plus"
  | "minus"
  | "edit"
  | "trash"
  | "history"
  | "alert-circle";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  color = "#1C1917",
  filled = false,
}) => {
  switch (name) {
    case "send":
      return <Feather name="send" size={size} color={color} />;
    case "sliders":
      return <Feather name="sliders" size={size} color={color} />;
    case "share":
      return <Feather name="share-2" size={size} color={color} />;
    case "refresh":
      return <Feather name="rotate-cw" size={size} color={color} />;
    case "user":
      return <Feather name="user" size={size} color={color} />;
    case "star":
      return (
        <Ionicons
          name={filled ? "star" : "star"}
          size={size}
          color={color}
        />
      );
    case "plane":
      return <Ionicons name="airplane-outline" size={size} color={color} />;
    case "hotel":
      return <Ionicons name="bed-outline" size={size} color={color} />;
    case "train":
      return <Ionicons name="train-outline" size={size} color={color} />;
    case "bus":
      return <Ionicons name="bus-outline" size={size} color={color} />;
    case "clock":
      return <Feather name="clock" size={size} color={color} />;
    case "calendar":
      return <Feather name="calendar" size={size} color={color} />;
    case "check":
      return <Feather name="check" size={size} color={color} />;
    case "close":
      return <Feather name="x" size={size} color={color} />;
    case "arrow-right":
      return <Feather name="arrow-right" size={size} color={color} />;
    case "arrow-up-right":
      return <Feather name="arrow-up-right" size={size} color={color} />;
    case "arrow-left":
      return <Feather name="arrow-left" size={size} color={color} />;
    case "sun":
      return <Feather name="sun" size={size} color={color} />;
    case "moon":
      return <Feather name="moon" size={size} color={color} />;
    case "settings":
      return <Feather name="settings" size={size} color={color} />;
    case "search":
      return <Feather name="search" size={size} color={color} />;
    case "message-square":
      return <Feather name="message-square" size={size} color={color} />;
    case "log-in":
      return <Feather name="log-in" size={size} color={color} />;
    case "mountain":
      return <Ionicons name="trail-sign-outline" size={size} color={color} />;
    case "building":
      return <Ionicons name="business-outline" size={size} color={color} />;
    case "compass":
      return <Feather name="compass" size={size} color={color} />;
    case "sparkles":
      return <Ionicons name="sparkles" size={size} color={color} />;
    case "shield":
      return <Feather name="shield" size={size} color={color} />;
    case "briefcase":
      return <Feather name="briefcase" size={size} color={color} />;
    case "menu":
      return <Feather name="menu" size={size} color={color} />;
    case "map-pin":
      return <Feather name="map-pin" size={size} color={color} />;
    case "chevron-down":
      return <Feather name="chevron-down" size={size} color={color} />;
    case "chevron-up":
      return <Feather name="chevron-up" size={size} color={color} />;
    case "chevron-right":
      return <Feather name="chevron-right" size={size} color={color} />;
    case "chevron-left":
      return <Feather name="chevron-left" size={size} color={color} />;
    case "filter":
      return <Feather name="filter" size={size} color={color} />;
    case "restaurant":
      return <Ionicons name="restaurant-outline" size={size} color={color} />;
    case "water":
      return <Ionicons name="water-outline" size={size} color={color} />;
    case "plus":
      return <Feather name="plus" size={size} color={color} />;
    case "minus":
      return <Feather name="minus" size={size} color={color} />;
    case "edit":
      return <Feather name="edit-2" size={size} color={color} />;
    case "trash":
      return <Feather name="trash-2" size={size} color={color} />;
    case "history":
      return <Feather name="clock" size={size} color={color} />;
    case "alert-circle":
      return <Feather name="alert-circle" size={size} color={color} />;
    default:
      return <Feather name="help-circle" size={size} color={color} />;
  }
};
